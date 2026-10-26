---
date: 2026-09-30
slug: site-growth-13-glimmer-gallery-moments
title_zh: 建站成长记录 13｜浮光集：把相册集和碎语收进同一个入口
title_en: Site Growth Log 13 | Glimmer: Putting Albums and Moments Behind One Entrance
excerpt_zh: 相册集和碎语原本是两个平级的导航入口，各占一格却都内容不多。这篇记录把它们合成“浮光集”一页的过程：上半是拍立得相册墙，下半是便利贴碎语，同时整理关于页多余区块，并把数据中心入口从导航挪到主页。
excerpt_en: Albums and Moments were two sibling navigation entries, each holding little. This post records merging them into one page called Glimmer — a polaroid wall above, sticky-note moments below — plus cleaning up the About page and moving the data-center entry from the nav to the homepage.
words: 3300
reads: 21
minutes: 11
---

# 建站成长记录 13：两个入口合成一个，问题反而变少了

导航栏里曾经同时有“相册集”和“碎语”。

两个都是内容页，都各有十几条内容，都占着一个导航位置。看起来对称，用起来有点空：点进去发现很快就看完了，再回到导航，还得再选一次。

## 为什么合并

真正让我下决心的不是“导航太长”，而是两个页面在回答同一个问题：**这里有什么留下来的东西。**

相册集是看过的画面，碎语是当时的念头。它们不是两种功能，是同一种记录的两个面。

所以合并的定位不是“把两个页面塞进一页”，而是做一页入口，让人先看到有什么，再选择深入。

导航项从两个变成一个：**浮光集**。

旧的 `/gallery` 和 `/moments` 没有删除，改成了跳转到新页面，避免以前散落在各处的链接变成死链。

## 页面结构

最终页面是一整条竖向的流，不是左右分栏，也不是“上半 banner、下半内容”的割裂布局：

| 区域 | 内容 | 交互 |
| --- | --- | --- |
| 顶部 | 标题与一句说明 | 无 |
| 相册集 | 两排相册卡，各有封面、张数与标题 | 点进原相册详情 |
| 碎语 | 全部碎语，便利贴样式高低错落 | 直接阅读，不跳页 |
| 页脚 | 常规页脚 | 无 |

这里有个刻意的差异：**相册是入口，碎语是内容。**

相册需要点进去看，因为图片多；碎语本身就是短句，展开就没有意义了。所以相册做成卡片墙，碎语直接铺开。

## 视觉上试了四轮

这一页的样式改了很多次，值得记下来，因为每一轮都是被具体的不满意推着改的：

| 轮次 | 形态 | 被否掉的原因 |
| --- | --- | --- |
| 1 | 三张等大入口卡片，各配插画 | 插画太像 AI 生成，和站内气质不搭 |
| 2 | 三本物件（相册书、手札、控制面板） | 概念清楚但太重，页面像展览海报 |
| 3 | 上半相册墙 + 下半碎语，中间有分栏 | 大片空白，还多出一条横向滚动条 |
| 4 | 连续页面：相册墙接碎语铺开 | 保留，作为基础结构 |

第 3 轮那条横向滚动条是个典型事故：为了横排相册用了 `overflow-x`，结果整页多出一条拖动条，视觉上非常廉价。删掉之后才意识到，相册墙本来就应该允许换行，而不是横向滑动。

## 顺手整理的两处

这次也清理了两个累积下来的问题。

**关于页去掉“我玩的游戏”和“本站说明”两块。** 它们是从早期预览页继承来的，和现在关于页的定位（介绍我自己和作品）不一致，留着只是在拉长页面。

**数据中心入口从导航挪到主页。** 数据中心是站长自己看服务器状态和 AI 调用流量的地方，放进顶部导航是把它当成内容页对待。现在它变成了主页留言区原来的位置上的一个入口卡片，说明文字改成“数据中心”，仍然跳转，不把面板直接铺在首页。

## 一次结构上的取舍

合并之后有个问题需要决定：碎语要不要保留独立页面？

我的答案是保留路由，但不再放导航。这样从旧链接进来还能看到，也不会在导航里制造第二个入口。

这条规则后来反复用到：**能不能被访问，和是否出现在导航里，是两件独立的事。**

---en---

# Site Growth Log 13: Merging Two Entrances Left Fewer Problems

The navigation once had both "Albums" and "Moments".

Both were content pages, each with a dozen or so entries, each holding a nav slot. Symmetric on paper, a little empty in practice: you click in, finish quickly, come back to the nav, and choose again.

## Why merge them

What settled it was not "the nav is too long". It was that both pages answered the same question: **what has been left here.**

Albums are the scenes that were seen. Moments are the thoughts at the time. They are not two features; they are two faces of the same kind of record.

So the merge is not "stuff two pages into one". It is one entrance page that shows what exists, then lets you go deeper.

Nav entries went from two to one: **Glimmer**.

The old `/gallery` and `/moments` routes were not deleted. They redirect to the new page, so links scattered elsewhere do not become dead ends.

## Page structure

The final page is one continuous vertical flow — not a split layout, and not a separated "banner above, content below" arrangement:

| Area | Content | Interaction |
| --- | --- | --- |
| top | title and one line of description | none |
| albums | two rows of album cards with cover, count, title | opens the album detail |
| moments | every moment, sticky-note style, staggered heights | read in place |
| footer | standard footer | none |

There is a deliberate asymmetry: **albums are an entrance, moments are content.**

Albums need to be opened because they hold many images. Moments are already short sentences; expanding them would be pointless. So albums became a card wall while moments simply spread out.

## Four rounds of visual attempts

This page was restyled many times, and it is worth recording because each round was driven by a specific dissatisfaction:

| Round | Shape | Why rejected |
| --- | --- | --- |
| 1 | three equal entry cards with illustrations | the illustrations read as AI-generated, off-tone |
| 2 | three objects (album book, notebook, control panel) | clear concept, too heavy; looked like an exhibition poster |
| 3 | album wall above, moments below, split in the middle | large empty region and an extra horizontal scrollbar |
| 4 | continuous flow: album wall into spread-out moments | kept as the base structure |

That horizontal scrollbar in round 3 was a classic self-inflicted issue: to lay albums out in a row I used `overflow-x`, and the whole page gained a drag bar that made it feel cheap. Removing it made me realize an album wall should wrap, not scroll sideways.

## Two cleanups along the way

This round also cleared two accumulated problems.

**The About page dropped its "games I play" and "about this site" blocks.** Both were inherited from the early preview page and no longer matched what the About page is for — introducing me and my work. They were only making the page longer.

**The data-center entry moved from the nav to the homepage.** The data center is where the owner checks server status and AI traffic; putting it in the top nav treated it as a content page. It now sits where the homepage guestbook used to be, as an entry card labelled 数据中心, still a link — the panel itself is not embedded in the homepage.

## One structural trade-off

After merging, one question had to be answered: should Moments keep its own page?

I kept the route but removed it from the nav. Old links still resolve; the nav no longer has a second entrance.

That rule kept coming back later: **being reachable and appearing in the navigation are independent decisions.**
