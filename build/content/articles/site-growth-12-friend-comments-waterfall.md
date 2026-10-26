---
date: 2026-09-29
slug: site-growth-12-friend-comments-waterfall
title_zh: 建站成长记录 12｜友链评论从一个列表长成一块讨论区
title_en: Site Growth Log 12 | Friend Comments Grew From a List Into a Discussion Board
excerpt_zh: 友链页的评论一开始只是单列往下排。这篇记录它后面几轮的形态变化：五条一页的小批量加载、双列到三列等高瀑布流、按颜色交错、以及头像防盗链和大图占位这两处不太显眼但影响很大的细节。
excerpt_en: Friend-page comments started as a single column scrolling downward. This post records the rounds that followed: five-item batches, two-to-three column masonry, alternating colors, and two quiet but impactful details — avatar hotlink protection and a proper placeholder.
words: 3400
reads: 24
minutes: 12
---

# 建站成长记录 12：评论区的形态是被使用方式推着改的

友链页的评论最初很简单：一个输入框，下面一列评论，按时间倒序。

它之所以变成现在这样，不是因为我想把它做得更花，而是因为几件具体的事一件件压上来。

## 先解决“一屏太长”

留言多起来之后，页面一打开就是很长的一列。访客要滚很久才能看到输入框之外的别的东西。

于是先加了按条数分批：一次只取 5 条顶层评论，底部一个“加载更多”，继续按 5 条拉。

这里有个容易做错的细节：**分页只数顶层评论，回复不计入。**

回复是挂在某条评论下面的上下文，如果它也参与分页，一条评论和它的对话就可能被切到两页，读起来非常别扭。所以总数、页大小、显示计数都只算顶层。

## 再解决“一列太窄太长”

5 条一列仍然很长。于是开始试瀑布流。

这个过程走了好几轮，每一轮都是被上一轮的具体问题推着走的：

| 轮次 | 形态 | 出现的问题 |
| --- | --- | --- |
| 1 | 双列等宽 | 长评论把整列拉得很高，两列高度差太大 |
| 2 | 三列等宽瀑布流 | 大屏上每条卡片太窄，字挤在一起 |
| 3 | 收窄成两列 | 观感稳了，但内容偏少时右列空一截 |
| 4 | 每列先补两条 | 高度更均衡，视觉上不塌 |
| 5 | 按五种颜色交错 | 相邻卡片不再完全一样，有了节奏 |

最后停在“三列等高 + 每列先显示两条 + 颜色交错”这个组合上。

一个反直觉的结论：**瀑布流在评论这种内容上，很难只靠 CSS 列分栏做好。** 分栏是按内容高度自动填充的，但评论卡片需要“先各给两条，再有就先给长的那列”。这需要知道每条的实际高度，所以最终是带着逻辑去分配的，而不是纯样式。

## 头像：一类看不见的错误

有一段时间，友链页上很多头像都变成了我自己的头像。

原因不是数据错了，而是回退逻辑写得太大方：任何头像加载失败，就换成本站头像。

那段代码只有几行：

```jsx
onError={event => { event.currentTarget.src = siteAvatarUrl; }}
```

看起来是“优雅降级”，实际效果是让页面看起来像所有人都用了同一个头像，反而更像坏了。

修这块分了两步：

第一步，把回退换成中性占位。所有人失败都显示同一张默认图，不再是站长的脸。

第二步，把占位从“另一个 URL”改成内联的 `data:` 图片。原因是那张 SVG 放在独立路径上，经过 SPA 路由时会被当成前端路由，返回首页 HTML 而不是图片文件——图片还是挂。

这两步其实是同一件事的两个面：**回退目标本身不能是需要再次加载的资源。**

## 防盗链：地址能打开不等于能用

还有一类头像是“地址看起来完全正常，放在页面上就是不显示”。

典型的是 B 站的头像 CDN。直接打开那个链接是能看到的，但作为 `<img>` 引用时，浏览器会带上 `Referer: https://taozhiyy.top/friends`，对方对站外来源返回 403，浏览器拿到的是一段 HTML 而不是图片。

解决办法是让请求不带 Referer：

```jsx
<img src={avatar} referrerPolicy="no-referrer" />
```

这类问题最难查，因为所有检查都显示“地址正常工作”。判断方式只有一个：**模拟从自己域名引用的那一次请求**，而不是直接访问。

## 数据这一侧也跟着改了

评论不只是前端排布，接口也调整了：

| 改动 | 目的 |
| --- | --- |
| 首屏只请求 5 条顶层评论 | 打开更快，也不一次性拉全量 |
| 回复按父评论聚合返回 | 前端不用自己拼树 |
| 新增去重（按 id） | 发新评论后分页位移不会重复显示 |
| 总数与已显示数量分开返回 | 页眉显示总数，底部显示“已显示 X/Y” |

去重那条是被真实问题逼出来的：发一条新评论后，后面所有页的内容都会往后挪一位，如果直接追加，就会看到重复卡片。

## 现在的样子

现在的友链评论区：

- 顶层评论分页加载，回复不占页大小
- 桌面三列等高，中等屏幕两列，手机单列
- 五种配色交错
- 头像失败显示统一的中性占位
- 评论和回复共处一张卡片，展开不会跑到别的列去

它仍然只是一个评论区，但已经能承载“来回对话”这件事了。

---en---

# Site Growth Log 12: A Comment Section Shaped by How It Was Used

Friend-page comments started simple: an input, one column underneath, newest first.

It did not become what it is now because I wanted it fancier. It changed because specific problems kept arriving.

## First: one screen was too long

Once there were enough messages, opening the page showed a very long column.

So comments started loading in batches: five top-level comments at a time, with a "load more" that fetches the next five.

One detail is easy to get wrong: **pagination counts top-level comments only. Replies do not count.**

Replies are context hanging under a comment. If they counted toward page size, a comment and its conversation could be split across two pages, which reads terribly. So the total, the page size, and the displayed counter all count top-level entries only.

## Next: one column was too narrow and too tall

Five in a column is still long. That is when masonry started.

It took several rounds, each pushed by the previous round's specific complaint:

| Round | Shape | Problem |
| --- | --- | --- |
| 1 | two equal columns | long comments stretched one column far taller than the other |
| 2 | three-column masonry | cards got too narrow on large screens; text felt cramped |
| 3 | back to two wider columns | looked calmer, but short lists left a visible gap |
| 4 | seed two cards per column | heights balanced, layout stopped sagging |
| 5 | alternate five color variants | neighbouring cards stopped looking identical |

It settled on: three equal-height columns, two seeded cards per column, alternating colors.

A slightly counterintuitive conclusion: **for comments, CSS column layout alone is usually not enough.** Columns fill by content height, but comments want "give each column two first, then give the next card to the tallest column". That needs actual heights, so the final version assigns cards with logic rather than pure styling.

## Avatars: an invisible class of bug

For a while, many friend avatars showed my own avatar instead.

The data was fine. The fallback was too generous: any failed avatar was replaced with the site owner's avatar.

The code was a few lines:

```jsx
onError={event => { event.currentTarget.src = siteAvatarUrl; }}
```

It looked like graceful degradation. In practice it made every friend look like the same person, which reads as broken rather than degraded.

The fix came in two steps.

First, the fallback became a neutral placeholder: everyone who fails gets the same default image, not the owner's face.

Second, the placeholder changed from "another URL" to an inline `data:` image. The reason: that SVG lived at its own path, and the SPA router treated that path as a client route, returning the app shell HTML instead of the image. The fallback was still broken.

Both steps are one idea: **the fallback target must not itself be a resource that can fail to load.**

## Hotlink protection: a working URL is not a usable asset

Another class was avatars whose addresses open perfectly in a browser tab but never render in the page.

The usual suspect is an avatar CDN that returns 403 when the request carries a foreign `Referer` — for example `Referer: https://taozhiyy.top/friends` — and answers with an HTML error page instead of an image.

The fix is to send no referrer at all:

```jsx
<img src={avatar} referrerPolicy="no-referrer" />
```

These are the hardest bugs to diagnose, because every direct check says "the URL works". The only reliable test is to simulate the request as it happens from your own domain.

## The data side moved too

Comments are not only layout. The API changed as well:

| Change | Purpose |
| --- | --- |
| first screen requests five top-level comments | faster opening, no full dump |
| replies bundled under their parent | no tree assembly in the frontend |
| dedupe by id | new comments shift pagination without duplicating cards |
| total and shown count returned separately | header shows total, footer shows "X of Y" |

Deduplication was forced by a real problem: after posting a new comment, every later page shifts by one, so naive appending shows duplicate cards.

## Where it is now

Today the friend comment area:

- paginates top-level comments; replies do not consume page size
- three equal columns on desktop, two on medium screens, one on phones
- five alternating color variants
- neutral shared placeholder on avatar failure
- comment and replies live in one card, expanding without jumping columns

It is still just a comment section — but it can now hold an actual back-and-forth.
