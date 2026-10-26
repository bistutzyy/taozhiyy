---
date: 2026-09-07
slug: site-growth-11-guestbook-script-attack
title_zh: 建站成长记录 11｜留言区被脚本试探：先止血，再看清楚
title_en: Site Growth Log 11 | When a Script Tested the Guestbook: Stop the Bleeding First
excerpt_zh: 首页留言区收到一批脚本化提交，内容里带着 XSS 试探。这篇记录处理顺序：先用服务端开关停掉首页留言提交，再去确认攻击到底有没有成功，最后判断页面渲染方式本身是否安全。
excerpt_en: The homepage guestbook received a burst of automated submissions carrying XSS attempts. This is the order I handled it in: disable submissions server-side first, then establish whether anything actually succeeded, then decide whether the rendering path itself was safe.
words: 3200
reads: 19
minutes: 11
---

# 建站成长记录 11：先关掉入口，再慢慢看清楚

那天打开后台，看见一批几乎相同的留言，昵称都带着同一个测试前缀。内容里混着 `<script>`、`onerror`、以及一些试图闭合标签的片段。

不是有人在和我聊天。是有人在批量试探这里有没有过滤。

## 第一步不是排查，是止血

最容易犯的错是先开始读日志、翻数据库、猜攻击者意图，而入口还开着。

所以我先做的是把提交关掉，而且关在服务端：

```text
POST /api/guestbook → 503
{ "code": "GUESTBOOK_DISABLED" }
```

这里有两个决定值得记下来。

第一个：**开关放在后端，不是前端。**

前端把按钮置灰只是体验层，脚本根本不会走那个按钮。只有后端拒绝，才是真的关掉了写入。

第二个：**只关首页留言，不动友链评论。**

友链评论走的是另一套校验，有昵称、邮箱和回复上下文的约束，和首页留言不是同一条链路。一刀切关掉全部互动，代价比风险更大。

前端也做了对应处理：留言区显示“暂时维护中，已暂停提交”，避免访客写完一段话才发现提交不上去。

## 第二步：确认到底有没有成功

关掉入口之后，才轮到排查。

我想确认的不是“有没有人来试”，而是“有没有一个真的写进去了”。这两件事完全不同。

排查的顺序是：

| 检查项 | 想知道什么 |
| --- | --- |
| 数据库里实际写入的记录 | 有几条真的落库了 |
| 昵称、时间、内容分布 | 是一次批量脚本，还是多个来源 |
| 页面渲染方式 | 内容会不会被当成 HTML 执行 |
| 服务端存储形态 | 存的是原文还是已处理过的 HTML |

结论是：确实有 3 条测试提交成功入库，内容以文本和 Markdown 风格的链接为主，没有真正可执行的标签。

## 第三步：渲染路径比过滤更重要

这次最有价值的发现，不在过滤规则上，而在渲染方式上。

首页留言是一条一条用文本节点渲染的：

```jsx
<p>{item.content}</p>
```

`{item.content}` 是 React 的文本插值，内容会被转义成字符串显示，不会解析成 DOM。也就是说，即使数据库里真的存了 `<script>`，它到了页面上也只是一段可见的文字。

这让我重新理解了留言区的安全边界：

| 层 | 作用 | 是否可依赖 |
| --- | --- | --- |
| 服务端输入校验 | 限制长度、格式、频率 | 可依赖，但不完美 |
| 存储形态 | 存原文，不做 HTML 拼接 | 可依赖 |
| 渲染方式 | 文本插值，禁止 `innerHTML` | 最该守住的一层 |
| 前端过滤 | 提示和预处理 | 只算体验层 |

很多 XSS 事故不是因为“过滤写得不够长”，而是因为某一层把用户内容当成了结构。真正决定后果的，是最后那一步渲染有没有用 `innerHTML`。

## 事后加了什么

止血之后做了几件收尾的事：

- 服务端开关保留下来，以后遇到类似情况可以立刻停写入，而不需要改代码部署
- 留言内容和昵称都不进入任何 `dangerouslySetInnerHTML` 路径
- 对友链评论和首页留言分别加了约束测试，防止以后有人为了“支持富文本”把渲染方式换掉
- 记录了这次的时间点和触发原因，避免以后看到同样现象又要从头查

## 这次学到的东西

处理顺序比技术细节更重要。

先用最小代价停掉风险入口，再收集事实，最后才动结构。反过来做，很容易在入口还开着的时候改代码、部署、再观察，中间又多出几十分钟的暴露时间。

另外一点：**能不能被利用，取决于渲染，而不是取决于过滤有多严。**

留言区后来重新开放时，我没有加一堆正则，而是确认了三件事：写入仍然是文本、渲染仍然是插值、开关仍然在服务端。

这三条守住，比任何过滤清单都稳。

---en---

# Site Growth Log 11: Close the Door First, Understand Later

One morning the owner console showed a batch of nearly identical messages with the same test prefix in the nickname. The content mixed `<script>`, `onerror`, and fragments that tried to close surrounding tags.

Nobody was chatting with me. Something was probing whether this place filtered anything.

## The first step is not investigation

The easy mistake is to start reading logs, digging through the database, and guessing intent — while the endpoint is still open.

So the first move was to close submissions, on the server:

```text
POST /api/guestbook → 503
{ "code": "GUESTBOOK_DISABLED" }
```

Two decisions here are worth recording.

First: **the switch lives in the backend, not the frontend.**

Greying out a button is a UI concern. A script never clicks that button. Only a server-side refusal actually stops writes.

Second: **only the homepage guestbook was closed, not friend-page comments.**

Friend comments go through a different validation path with nickname, email, and reply context. Shutting down every form on the site would cost more than the risk actually posed.

The frontend followed: the guestbook now says submissions are paused, so a visitor does not write a paragraph before discovering it cannot be sent.

## Second step: establish whether anything succeeded

With the entrance closed, investigation could start.

The question was not "did someone try" but "did anything actually get written". Those are very different questions.

The order I checked:

| Check | What I wanted to know |
| --- | --- |
| rows actually in the database | how many really landed |
| nickname, time, content distribution | one bulk script or several sources |
| how the page renders content | whether content could execute as HTML |
| how content is stored | raw text or pre-assembled HTML |

The answer: three test submissions had gone in. Their content was text and Markdown-style links, with no genuinely executable markup.

## Third step: rendering matters more than filtering

The most useful finding was not about filter rules. It was about the render path.

Homepage messages are rendered one at a time as a text node:

```jsx
<p>{item.content}</p>
```

`{item.content}` is React text interpolation. Content is escaped and displayed as a string; it never becomes DOM. So even if `<script>` had been stored, it would show up as visible text.

That reframed the security boundary of the guestbook:

| Layer | Purpose | Depended on? |
| --- | --- | --- |
| server-side input validation | length, shape, rate | yes, but not perfect |
| storage form | keep raw text, never assemble HTML | yes |
| render path | text interpolation, no `innerHTML` | the layer to protect |
| frontend filtering | hints and preprocessing | UX only |

Most XSS incidents do not come from filters being too short. They come from some layer treating user content as structure. What actually decides the outcome is whether the final render goes through `innerHTML`.

## What was added afterwards

After the bleeding stopped:

- the server-side switch stayed, so a similar situation can be stopped without a code deploy
- message content and nicknames never enter a `dangerouslySetInnerHTML` path
- constraint tests were added for both friend comments and homepage messages, so nobody can swap the render path later in the name of "rich text"
- the timing and trigger were written down, so a repeat would not start from zero

## What I took away

Sequence matters more than technique.

Stop the risky entrance with the smallest possible change, collect facts, and only then touch structure. Doing it the other way around means editing code and deploying while the entrance is still open, adding tens of minutes of exposure.

The other lesson: **exploitability depends on rendering, not on how strict the filter is.**

When the guestbook reopened, I did not add a pile of regexes. I confirmed three things: writes are still text, rendering is still interpolation, and the switch is still on the server.

Those three hold better than any blocklist.
