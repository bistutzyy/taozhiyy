---
date: 2026-10-02
slug: site-growth-14-four-seasons-theme
title_zh: 建站成长记录 14｜四季主题：四个页面，四种天气
title_en: Site Growth Log 14 | Seasonal Themes: Four Pages, Four Kinds of Weather
excerpt_zh: 关于我、浮光集、哔哩哔哩、友链四个页面各自换成春、夏、秋、冬。这篇记录的是反复被否掉的过程：从只换底色的敷衍版本，到堆装饰的过头版本，最后收敛成“轻背景 + 少量真实元素”，以及过程中遇到的底色闪现、视频闪蓝、SPA 路由吞掉图片这几个坑。
excerpt_en: About, Glimmer, Bilibili, and Friends each took on spring, summer, autumn, and winter. This post records the rejected rounds — from lazy color-only versions to over-decorated ones — and how it converged on light backgrounds with a few honest elements, plus the flashes and routing traps encountered on the way.
words: 3600
reads: 26
minutes: 13
---

# 建站成长记录 14：四季不是一个配色方案

一开始我以为这件事很简单：给四个页面各配一个季节色调。

做完第一版就发现不对。四个页面确实变成了粉、蓝、橙、白，但它们看起来只是“同一个页面换了四个滤镜”。季节没有出现在任何地方。

真正的难点不是配色，是**让人认得出这是哪个季节，又不让装饰抢走内容**。

## 最终的分工

四个页面和四季的对应关系：

| 页面 | 季节 | 主元素 | 背景处理 |
| --- | --- | --- | --- |
| 关于我 | 春 | 樱花花瓣飘落 | 粉白绿柔和渐变 |
| 浮光集 | 夏 | 动态海浪视频 | 浅滤镜，压低亮度 |
| 哔哩哔哩 | 秋 | 枫叶、纸感、暖色卡 | 浅奶油底色 |
| 友链 | 冬 | 雪花、冰蓝边 | 冷白，几乎无底色 |

一条贯穿全部的原则：**季节感放在背景和零星元素上，不放到内容卡片里。**

相册卡、番剧卡、友链卡、评论卡都保持原来的样子。它们上面叠加的只是页头、背景和页脚的颜色。

## 被否掉的几版

这一页的迭代基本是一次负面清单的积累：

| 版本 | 做法 | 问题 |
| --- | --- | --- |
| 1 | 只改背景色和文字色 | 完全不像季节，只是换了主题色 |
| 2 | 加胶片、票根、邮戳、月亮、枝条 | 元素太多，像贴纸拼贴，且很“AI 感” |
| 3 | 秋做成放映厅，冬做成信箱 | 概念好，但太重，压住了内容 |
| 4 | 参考现成主题的克制版本 | 方向对了，但一开始过度复刻，丢了自己的页面 |
| 5 | 连续页面 + 少量真实元素 | 保留 |

第 4 轮里有个反复出现的错误：我拿到一个参考风格，就把整个页面换成它，忘了这些页面本来已经有自己的结构。后来才明确——参考只用来定“气氛的浓度”，结构仍然归原来的页面。

## 季节元素必须是“形状”，不是“色块”

花瓣、雪花、枫叶这些东西，做小了看不见，做大了会挡住内容。

中间有一版雪花是线条拼出来的八角形，被我否掉了，因为它看起来像雷达图上的标记，不像雪。换成真正的雪花字符、并加大尺寸之后才成立。

同理，秋季的落叶一开始用的是系统 emoji，颜色会跟着系统变，于是改成 CSS 画的形状，颜色才稳定可控。

这两次调整指向同一件事：**装饰元素要有明确的形状语义，否则只会被读成噪点。**

## 三个技术坑

视觉之外，这一轮踩了三个很具体的技术问题。

**一、加载前会露出底色。**

春夏秋三页最初都有“先看到一片底色，再看到主题背景”的闪动。原因是页面容器自带一个兜底背景色，在背景层（视频或渐变）加载完成之前，它先被画出来。

修法是把这个兜底改成透明：

```css
.seasonal-page--summer { --season-bg: transparent; }
```

代价是背景层加载完成前是白的，但白比“先蓝一下再变海浪”自然得多。

**二、视频首帧是蓝色。**

浮光集的夏季背景是一条海浪视频。视频开始播放前，容器里的渐变兜底是蓝色的，于是页面上会先出现一块蓝，再变成海。

修法有两层：把兜底渐变改成更接近海面的浅灰白，以及让视频尽量早开始播放。

**三、独立的 SVG 路径被路由吃掉。**

给头像做统一占位时，我把占位图放在一个独立路径。结果这个路径被 SPA 路由当成前端路由，返回的是首页 HTML，浏览器拿到的不是图片，占位依然是坏的。

最后的解法是把占位图改成内联 `data:` 资源，彻底不经过网络请求。

这个坑后来在别的地方也提醒了我：**静态资源路径和前端路由的边界，必须明确。**

## 让页脚跟着季节走

最后一个问题出在页脚。

页面背景换了，页脚如果还是统一颜色，就会像一块贴上去的板子。所以四个页面的页脚都按季节重做：春是粉白过渡，夏是浅青，秋是暖米，冬是冷白。

试过让页脚更强地分区（加一条明显的分割线），结果反而更突兀，于是退回透明度更高、几乎融进背景的版本。

## 现在的四季

现在四个页面各有天气，但打开时仍然能认出这是同一个站：

- 相同的字体、相同的卡片语言
- 相同的页头骨架，只是颜色和元素不同
- 内容不会被装饰遮住

四季主题最终没有变成四套皮肤，而是同一个站点的四种光线。

---en---

# Site Growth Log 14: Four Pages, Four Kinds of Weather

At first I assumed this was simple: give four pages a seasonal color each.

The first version disproved it. The pages did turn pink, blue, orange, and white — but they looked like one page with four filters. The season was not really anywhere.

The hard part is not color. It is making the season recognizable **without letting decoration take over the content**.

## The final assignment

| Page | Season | Main element | Background |
| --- | --- | --- | --- |
| About | spring | falling sakura petals | soft pink-white-green gradient |
| Glimmer | summer | looping ocean video | light filter, reduced brightness |
| Bilibili | autumn | maple leaves, paper feel, warm cards | pale cream |
| Friends | winter | snowflakes, ice-blue edges | cold white, nearly no tint |

One rule runs through all of it: **seasonality lives in the background and a few elements, never inside the content cards.**

Album cards, anime cards, friend cards, and comment cards keep their original look. Only headers, backgrounds, and footers take the seasonal color.

## The rejected rounds

The iteration was mostly an accumulation of a negative list:

| Version | Approach | Problem |
| --- | --- | --- |
| 1 | change only background and text color | not seasonal at all, just a new accent |
| 2 | add film strip, ticket, postmark, moon, branches | too many elements; sticker collage; very "AI" |
| 3 | autumn as a screening room, winter as a mailbox | good idea, too heavy, buried the content |
| 4 | a restrained version inspired by existing themes | right direction, but initially copied too much and lost our own page |
| 5 | continuous page with a few honest elements | kept |

Round 4 had a recurring mistake: given a reference style, I would replace the entire page with it, forgetting these pages already had their own structure. The rule that settled it: a reference defines **how strong the atmosphere should feel**, not the structure.

## Seasonal elements need shape, not just color

Petals, snowflakes, maple leaves: too small and they are invisible, too large and they cover content.

One intermediate snowflake was an eight-point star assembled from lines. I rejected it because it read like a radar marker, not snow. Switching to an actual snowflake glyph and increasing the size made it work.

Similarly, autumn leaves began as system emoji, whose colors follow the OS. Replacing them with CSS-drawn shapes made the color stable and controllable.

Both fixes point at the same thing: **decorative elements need a clear shape semantic, or they just read as noise.**

## Three technical traps

Beyond visuals, three concrete problems came up.

**One: the base color flashed before loading.**

Spring, summer, and autumn initially showed a flat color first, then the theme background. The page container carried a fallback background that painted before the background layer (video or gradient) was ready.

The fix was making that fallback transparent:

```css
.seasonal-page--summer { --season-bg: transparent; }
```

The trade-off is a white moment before the layer loads — but white is far more natural than "blue, then suddenly ocean".

**Two: the video's first frame was blue.**

Summer's background is an ocean video. Before playback, the container's gradient fallback was blue, so a blue block appeared before the sea.

Two layers of fix: shift the fallback toward a pale sea-grey, and start the video as early as possible.

**Three: a standalone SVG path was swallowed by routing.**

While adding a shared avatar placeholder, I put the image at its own path. The SPA router treated the path as a client route, returned the app shell HTML, and the browser never received an image — the placeholder stayed broken.

The final fix was an inline `data:` resource that never touches the network.

That trap stayed with me: **the boundary between static asset paths and client routes has to be explicit.**

## Footers follow the weather

The last issue was the footer.

With seasonal backgrounds, a uniformly colored footer looked like a board glued on. So all four footers were redone by season: pink-white for spring, pale cyan for summer, warm cream for autumn, cold white for winter.

I tried a stronger separation first — a visible divider line — and it felt worse. It went back to a more transparent version that nearly blends into the background.

## Today's four seasons

The four pages each have weather now, yet still read as one site:

- same typography, same card language
- same header skeleton, only color and elements differ
- content never hidden by decoration

The seasonal theme did not become four skins. It became four kinds of light on one site.
