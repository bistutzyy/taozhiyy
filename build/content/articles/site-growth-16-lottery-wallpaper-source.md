---
date: 2026-10-26
slug: site-growth-16-lottery-wallpaper-source
title_zh: 建站成长记录 16｜抽奖机突然抽不出图：一次图源失效的排查
title_en: Site Growth Log 16 | When the Lottery Stopped Showing Pictures: Tracing a Dead Image Source
excerpt_zh: 首页抽奖还能转出结果，图片却永远是破图。这篇记录排查的三层结论：接口是好的、图池六月份就停止更新、第三方图源域名已经指向了别人的服务器；以及换源之后为什么还是慢——社区镜像的回源冷启动，最终把图源换成静态 CDN，首屏从 3–8 秒降到 1 秒内。
excerpt_en: The homepage lottery still returned results, but every picture was broken. This post records three layers of diagnosis — the API was fine, the pool had frozen in June, and the third-party domain now pointed at someone else's server — then why a new source was still slow, and how swapping to a static CDN took first paint from 3–8 s down to under one second.
words: 4200
reads: 32
minutes: 14
---

# 建站成长记录 16：抽奖机突然抽不出图

有天想抽一张壁纸，转盘照常转，结果卡片也出来了，图片位置却是一个破图图标。刷新、重抽，都一样。

第一反应是"接口挂了"。但这次的第一反应是错的。

## 第一层：接口是好的

先查后端，没有猜。

```
GET /api/v1/wallpapers/draw?source=api  → 200
```

连续抽 15 次，拿到 14 个不同的 id。说明抽奖逻辑、随机、数据库写入全都正常，池子里也确实有货。

问题不在接口。这是第一个被排除的假设。

## 第二层：图池停在六月

接着看返回数据里的时间字段，每条都带着 `addedAt`。

结果所有条目的 `addedAt` 都是同一天：

```
2026-06-05
```

也就是说，这个图池**只有六月五号成功同步过一次**，之后一年多的每小时同步全部失败，只是一直在吐那批旧数据。

一个每小时的定时任务默默失败了几个月，而页面上看起来"还能用"——因为旧数据永远抽得出来。

## 第三层：域名指向了别人的服务器

真正的答案在图片地址上。所有图片都指向 `cdn.waifu.im`，于是我直接测这个域名和它的 API：

| 检查 | 结果 |
| --- | --- |
| 域名解析 | 正常，能拿到 IP |
| TCP 443 | 能连上 |
| TLS 证书 | **不是 waifu.im 的** |
| 关掉证书校验再请求 | **404** |

证书细节最关键：

- `api.waifu.im` 返回的证书属于 `grimbert.net`
- `cdn.waifu.im` 返回的证书属于 `s3.fr-par.scw.cloud`

两个完全不同域名的证书，各自指向另一个真实服务。这说明不是墙、不是 DNS 污染、也不是防盗链，而是**这两个域名背后的服务已经不是 waifu.im 了**。

关掉证书校验后拿到 404，进一步确认：那台机器上根本没有这个 API 和这些图片。

所以结论是：**图源整体失效**，不是我这边的调用或者网络问题。

## 为什么不能只做「转存」

第一方案本来是：服务器把图下载下来，转存到腾讯 COS，前端只加载自己的域名。这样第三方挂了也不影响访客。

但这次它不成立，因为**没有素材可转**——图片本身已经 404 了。

而且这笔账要算清楚：转存意味着 COS 的存储费用和 CDN 流量费用，对一个小站来说是把"每张图"变成"长期成本"。这次的需求只是抽奖时看一张好看的路人插画，不值得为它建一条资源管线。

所以最终方向是：**换一个还活着的源，继续直连，不转存。**

## 挑新图源

候选测了几个，实测结果直接决定取舍：

| 源 | 结果 |
| --- | --- |
| `waifu.pics` | 域名已经解析不了 |
| `wallhaven` 匿名 API | 本机网络超时 |
| `pic.re` | 可用，但原图 1–2.7MB，最大 5385×3029 |
| `api.lolicon.app` | 可用，横图过滤、可按尺寸取图 |

选 Lolicon，理由是它的返回里直接给了多个尺寸的地址，而且图床 `i.pixiv.re` **带外站 Referer 也能正常返回图片**——这一点必须实测，因为很多图床会对外站来源返回 403，那种情况下直连方案根本不成立。

## 三个改动

**一、换源。**

请求参数固定成：`r18=0`、`aspect_ratio=horizontal`、`size=regular`、`proxy=i.pixiv.re`，只留横图、非 R18。

**二、让失效源能被下线。**

这才是这次真正的教训。库里那批六月的记录一直是 `status=active`，所以抽奖还是会抽到它们。

于是加了一个概念：**启用中的图源列表**。每次同步开始时，先把不在列表里的图源全部置为 `inactive`：

```sql
UPDATE wallpaper_pool SET status='inactive'
WHERE kind='api' AND status='active' AND source NOT IN (...)
```

这一步特意放在**拉取之前**。因为如果放在拉取之后，一旦新源临时失败，程序就提前 return 了，死链又会继续被抽到。

顺序在这里不是风格问题，是正确性问题。

**三、卡片改用轻量预览图。**

验收时发现一个次要但扎眼的问题：结果卡片直接加载 `url`，也就是 1200px 的大图（1MB 上下）。图床冷启动要回源，几秒钟才出图，用户看到的就是"抽了但没图"。

所以卡片改成优先用 `previewUrl`（540px 缩略图，几十 KB），点开时才看原图。

## 验收

改完之后的实测数字：

| 项 | 结果 |
| --- | --- |
| 连续抽取 | 100% 返回 `lolicon`，不再出现失效源 |
| 预览图加载（带本站 Referer） | 绝大部分 1–4 秒 |
| 慢图 | 约 1/12 会命中一张上游本来就慢的图，重抽即可 |
| 站点页面 | `/`、`/friends`、`/glimmer`、`/build/` 全部 200 |

看起来问题解决了。其实没有。

## 后续：镜像的冷启动才是真凶

上线之后还是慢。有人反馈"高清壁纸半天加载不出来"，我自己复测，一张图卡了 104 秒。

把同一张图分别打到两个镜像上：

| 镜像 | 冷图耗时 |
| --- | --- |
| `i.pixiv.re` | 3–8 秒，偶发 100 秒+ |
| `i.pixiv.nl` | 3–8 秒，同样会超时 |
| `i.pixiv.cat` | 直接不可用 |

两个镜像表现一致，说明不是某一家的问题：**这类社区镜像都是"第一次被请求才回源 Pixiv 抓图"**，所以必然有冷启动。开不开代理都一样，因为慢的不是链路，是回源。

换镜像解决不了，于是又换了一次源。

这次换成 `t.alcy.cc`：它的 `/pc` 会 302 到一个**静态 webp**（实测 0.9 秒、236KB）。静态文件没有回源过程，这才是真正去掉了那几秒。

实现上只做了一件小事：请求 `/pc` 时**不跟随重定向**，只读 `Location` 头，把它拼成绝对地址入池，全程不下载图片。

再验收一次：

| 项 | 结果 |
| --- | --- |
| 连续抽取 | 8/8 全部为静态源 |
| 图片加载 | 0.75–1.13 秒，中位 0.95 秒 |
| 失败 | 0 |

同一批测试，从"3–8 秒、偶发 104 秒"，变成"稳定 1 秒以内"。

这里还补了两条护栏：图池上限从 1000 收到 120（让抽取落在近期条目上），以及同步时服务器把新图各拉一次做预热——预热属于入站流量，不产生出网计费。

## 这次学到的

- **"有数据"和"数据可用"是两件事。** 接口一直返回 200，池子里一直有记录，但每一条都是死链。健康检查只看接口状态，是发现不了这种故障的。
- **"能拿到图"和"能很快拿到图"也是两件事。** 第二次踩的坑就在这里：JSON API 元数据很漂亮、图片也确实能出来，但图床冷启动 3–8 秒，用户体感就是坏的。选源要测的是首屏时间，不是响应码。
- **静默失败最贵。** 每小时同步失败一次，日志里只有一行 `sync skipped`，没人看。真正的告警应该是"图源连续 N 次失败"，而不是"服务还活着"。
- **外部依赖要有"可控下线"的开关。** 这次不是靠改代码删数据，而是靠配置一个启用列表，让失效源自动退场——所以三次换源，旧数据都是自动退场的。
- **成本决定架构。** 转存 COS 技术上更稳，但对小站是长期账单；直连第三方更脆，但零成本。这次选了后者，并且把"失效会被自动踢掉"补上，作为对脆性的对冲。

---en---

# Site Growth Log 16: When the Lottery Stopped Showing Pictures

One day I tried to draw a wallpaper. The wheel spun, the result card appeared, and the image slot showed a broken-image icon. Refresh, redraw, same thing.

My first instinct was "the API is down." That instinct was wrong.

## Layer one: the API was fine

I checked the backend instead of guessing.

```
GET /api/v1/wallpapers/draw?source=api  → 200
```

Fifteen draws gave fourteen distinct ids. The lottery logic, the randomization, the database writes — all healthy, and the pool genuinely had rows in it.

The API was not the problem. That was the first hypothesis eliminated.

## Layer two: the pool froze in June

Next I looked at the timestamps carried by each item: `addedAt`.

Every single row said the same day:

```
2026-06-05
```

So the pool had synced successfully **exactly once, on June 5**, and then every hourly sync for months had failed — while continuing to serve that same stale batch.

An hourly job had been quietly failing for months, and the page still looked "working", because stale rows always draw fine.

## Layer three: the domain pointed at somebody else's server

The real answer was in the image URLs. Everything pointed at `cdn.waifu.im`, so I tested that host and its API directly:

| Check | Result |
| --- | --- |
| DNS | resolves, an IP comes back |
| TCP 443 | connects |
| TLS certificate | **not waifu.im's** |
| Request with verification disabled | **404** |

The certificate details were the decisive part:

- `api.waifu.im` presented a certificate for `grimbert.net`
- `cdn.waifu.im` presented a certificate for `s3.fr-par.scw.cloud`

Two unrelated real domains behind two names. That rules out a network block, DNS poisoning, and hotlink protection alike: **the services behind those names are no longer waifu.im.**

With verification off I still got 404, confirming there is no API and no image there at all.

Conclusion: the image source itself was gone — not my call path, not the network.

## Why "just mirror it to COS" did not apply

The first plan had been: have the server download the images, re-host them in Tencent COS, and let the frontend load only our own domain. Then a dead third party would not matter.

That plan fails here, because **there was nothing left to mirror** — the images were already 404.

And the cost maths matters: mirroring means COS storage plus CDN traffic, turning "one image" into a recurring bill. The requirement was a nice illustration on a lottery draw. That does not justify building an asset pipeline.

So the direction became: **find a source that still works, keep linking directly, do not mirror.**

## Picking the new source

I measured candidates rather than assuming:

| Source | Result |
| --- | --- |
| `waifu.pics` | domain no longer resolves |
| `wallhaven` anonymous API | timed out from this network |
| `pic.re` | works, but originals are 1–2.7 MB, up to 5385×3029 |
| `api.lolicon.app` | works; landscape filter and per-size URLs |

Lolicon won because it returns several sizes per image, and its image host `i.pixiv.re` **still serves images when the Referer is a foreign site**. That had to be measured — many image hosts answer 403 to external referrers, and if that had been the case, direct linking would never have worked.

## Three changes

**One: swap the source.**

Fixed parameters: `r18=0`, `aspect_ratio=horizontal`, `size=regular`, `proxy=i.pixiv.re`.

**Two: make retired sources actually retire.**

This is the real lesson. Those June rows were still `status=active`, so the draw kept returning them.

So I introduced an **enabled source list**. At the start of every sync, any source not on it is set to `inactive`:

```sql
UPDATE wallpaper_pool SET status='inactive'
WHERE kind='api' AND status='active' AND source NOT IN (...)
```

That step deliberately runs **before** the fetch. If it ran after, a temporary upstream failure would return early, and dead rows would keep being drawn.

Here, ordering is not style. It is correctness.

**Three: the card uses the lightweight preview.**

Acceptance testing exposed a smaller but visible issue: the result card loaded `url` — the 1200px original, around 1MB. Cold image-host requests take seconds, which reads as "I drew something and got no picture."

So the card now prefers `previewUrl` (a 540px thumbnail, tens of KB) and only loads the full original when opened.

## Acceptance

Measured after the change:

| Check | Result |
| --- | --- |
| Consecutive draws | 100% `lolicon`; the retired source never appears |
| Preview load (with our Referer) | mostly 1–4 s |
| Slow images | roughly 1 in 12 hits an upstream that is simply slow; redraw works |
| Site pages | `/`, `/friends`, `/glimmer`, `/build/` all 200 |

It looked solved. It was not.

## Follow-up: the mirror's cold start was the real culprit

After shipping, it was still slow. Someone reported that the HD wallpaper took forever, and my own retest hung on one image for 104 seconds.

The same image, requested through two mirrors:

| Mirror | Cold image |
| --- | --- |
| `i.pixiv.re` | 3–8 s, occasionally 100 s+ |
| `i.pixiv.nl` | 3–8 s, also times out |
| `i.pixiv.cat` | dead |

Both mirrors behave the same, so it is not one bad provider: **these community mirrors only fetch from Pixiv on first request.** Cold start is structural. It makes no difference whether a proxy is on, because the slow part is the upstream fetch, not the route.

Swapping mirrors could not fix it, so I swapped sources again.

This time to `t.alcy.cc`: its `/pc` answers with a 302 to a **static webp** (measured 0.9 s, 236 KB). A static file has no origin fetch behind it, which is what removes those seconds.

The implementation change is small: request `/pc` **without following redirects**, read only the `Location` header, resolve it to an absolute URL, and store that. No image is downloaded during sync.

Acceptance again:

| Check | Result |
| --- | --- |
| Consecutive draws | 8/8 static source |
| Image load | 0.75–1.13 s, median 0.95 s |
| Failures | 0 |

The same test went from "3–8 s, occasionally 104 s" to "consistently under one second".

Two guard rails came with it: the pool cap dropped from 1000 to 120 so draws land on recent rows, and sync now warms each new image server-side — inbound traffic, no egress billing.

## What this taught me

- **"Has data" and "has usable data" are different facts.** The API kept returning 200, the pool kept returning rows, and every row was a dead link. A health check that only looks at status codes cannot see this failure.
- **"Can fetch it" and "can fetch it fast" are different facts too.** That was the second trap: beautiful JSON metadata, images that do arrive, and a 3–8 s cold start that users experience as broken. What matters when choosing a source is first-paint time, not response codes.
- **Silent failure is the expensive kind.** One hourly sync failed with a single `sync skipped` log line that nobody read. The alert worth having is "the source failed N times in a row", not "the service is up".
- **External dependencies need a controlled off-switch.** The fix was not deleting rows by hand but configuring an enabled list, so a retired source removes itself — which is why all three source swaps retired the old data automatically.
- **Cost decides architecture.** Mirroring to COS is technically sturdier but is a recurring bill for a small site; direct linking is more fragile but free. I chose the latter and added "dead sources get kicked out automatically" as the hedge against that fragility.
