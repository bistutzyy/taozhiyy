---
date: 2026-10-26
slug: site-growth-15-time-archive
title_zh: 建站成长记录 15｜把文章列表改成一条时间轴
title_en: Site Growth Log 15 | Turning an Article List Into a Timeline
excerpt_zh: 这个记录页原本只是一列文章卡片，读起来像目录。这篇记录它被改造成“时光档案馆”的过程：滚动时间轴、分类筛选、搜索与排序、随滚动点亮的索引，以及一套刻意避开四季色的档案纸视觉。
excerpt_en: This log page used to be a list of article cards — a table of contents. This post records rebuilding it as a time archive: a scroll-driven timeline, category filters, search and sort, an index that lights up while you scroll, and an archive-paper look that deliberately avoids the seasonal palette.
words: 3000
reads: 12
minutes: 10
---

# 建站成长记录 15：目录不是故事的讲法

这一页原来很简单：一列文章卡片，按时间倒序，点进去看正文。

问题在于它读起来像目录。每次回到这里，看到的都是同样一堆卡片标题，感觉不到“这件事发生过”。

一个记录自己生长的页面，应该让人先感觉到时间在往前走。

## 为什么选滚动时间轴

参考过几种形态：幻灯片式、年份分组、卡片瀑布流。

最后选了滚动时间轴，因为它同时满足三件事：

- 时间本身是结构，不是排序字段
- 滚动和“往后翻”是同一个动作，不需要额外提示
- 每条记录可以有自己的伸展空间，长短不一也没关系

具体实现是一个竖向轨道，左侧是日期、编号和节点，右侧是记录内容。轨道上的进度线跟随滚动延伸，节点进入视口附近时，右侧索引会跟着切换。

## 内容不是 Git 提交

一个很重要的取舍：**没有把 commit 直接铺上去。**

仓库里几百个提交，其中大部分是“调一下间距”“修个路径”，对访客没有意义。所以我保留了原本的 9 篇手写记录，另外补上最近的几篇，把它们当成叙事的节点，而不是变更日志。

筛选也按这个思路设计：

| 分类 | 含义 |
| --- | --- |
| 设计手记 | 视觉、布局、文案上的判断 |
| 功能生长 | 加进来的能力 |
| 幕后工程 | 部署、安全、数据结构 |

一条记录只属于一个分类，避免筛选出来到处都是同一个条目。

## 页面上的几个具体部件

| 部件 | 作用 |
| --- | --- |
| 分类筛选 | 带计数，点了立刻过滤 |
| 搜索 | 匹配中英标题、摘要、标签和日期 |
| 倒序切换 | 默认最新在前，可切最早在前 |
| 阅读索引 | 右侧列出全部记录，随滚动高亮当前条目 |
| 记录笔记 | 每条都可展开看摘要，不用跳页 |
| 图片放大 | 页面留影点开看大图 |
| 卷首信息 | 总篇数、起始日期、最近一页 |

阅读索引是这次最有用的一个部件。时间轴一长，滚动会失去位置感；有一个一直在旁边的列表，随时知道自己在哪。

## 视觉：避开四季

这个页面最需要避免的，是重复四季主题。

四季已经占用了“自然景物 + 季节色”这个方向，如果记录页也去做渐变背景和花叶装饰，整站会变得同质。

所以这一页选了完全不同的语言：

| 元素 | 选择 |
| --- | --- |
| 底色 | 雾白偏冷的纸面 |
| 文字 | 石墨灰，不用纯黑 |
| 强调色 | 低饱和玫红（编号、节点） |
| 次强调 | 青绿（批注、状态点） |
| 字形 | 标题用手写体，正文保持可读的无衬线 |

玫红和青绿这两个颜色其实是站内一直在用的，只是在四季页里被自然色盖住了。在这里把它们提出来做主色，反而让整站看起来是一套体系。

## 中英双语的细节

这个站一直是中英双语的。时间轴里每条记录都有两套标题、两套摘要、两套标签。

需要注意的不只是文案，还有排版：中文标题短、英文标题长，同一个位置放两种语言，行高和折行表现完全不同。所以标题区留了足够的弹性高度，而不是固定行数。

## 回头看

这次改造没有加任何新内容，改的是“怎么讲”。

同样的 9 篇旧记录，加上最近几篇新记录，在一个只会往下滚的页面里，变成了一段可以往回看的路。

一个记录页最该做到的事，大概就是让人愿意从头滚一遍。

---en---

# Site Growth Log 15: A Table of Contents Is Not How You Tell a Story

This page used to be simple: a column of article cards, newest first, click to read.

The problem was that it read like a table of contents. Every visit showed the same stack of card titles, and it never felt like anything had happened.

A page that records its own growth should let you feel time moving first.

## Why a scrolling timeline

I considered several shapes: slideshow, year grouping, card masonry.

A scrolling timeline won because it does three things at once:

- time is the structure, not just a sort field
- scrolling and "turning the page" are the same gesture, needing no extra hint
- each record can take the space it deserves, long or short

The implementation is a vertical track: dates, numbers, and nodes on the left, record content on the right. A progress line extends with scrolling, and the index on the right follows whichever node is near the viewport.

## The content is not git commits

An important trade-off: **commits were not dumped onto the page.**

The repository holds hundreds of commits, most of them "adjust spacing" or "fix path", meaningless to a visitor. So the original nine hand-written records stayed, and a few recent ones were added — treated as narrative beats, not a changelog.

Filtering follows the same idea:

| Category | Meaning |
| --- | --- |
| Design notes | visual, layout, and copy decisions |
| Feature growth | capabilities that were added |
| Behind the scenes | deployment, security, data structures |

Each record belongs to exactly one category, so filtering never produces the same entry everywhere.

## Concrete parts of the page

| Part | Purpose |
| --- | --- |
| category filters | with counts; filter immediately |
| search | matches both languages, summaries, tags, dates |
| order toggle | newest first by default, oldest available |
| reading index | lists every record; highlights the current one on scroll |
| record notes | expand a summary inline without leaving the page |
| image zoom | page snapshots open at full size |
| colophon | total records, starting date, latest entry |

The reading index is the most useful part. A long timeline loses your sense of position; a list that stays beside you restores it.

## Visual language: avoid the seasons

The main thing to avoid here was repeating the seasonal theme.

The four seasons already own "natural scenery plus seasonal color". If the log page also used gradient backgrounds and petal decorations, the whole site would flatten out.

So this page chose a different vocabulary:

| Element | Choice |
| --- | --- |
| base | cool mist-white paper |
| text | graphite grey, never pure black |
| accent | low-saturation rose (numbers, nodes) |
| secondary | teal (annotations, status dots) |
| type | handwritten display for titles, readable sans for body |

Rose and teal were already in the site's system, just buried under natural tones on the seasonal pages. Promoting them here made the site read as one family.

## Bilingual details

The site has always been bilingual. Every record carries two titles, two summaries, two tag sets.

What needed attention was not only copy but layout: Chinese titles are short, English ones are long. In the same slot, line heights and wrapping behave completely differently. So the title block was given flexible height instead of a fixed number of lines.

## Looking back

No new content was added. What changed was how it is told.

The same nine old records, plus a few recent ones, inside a page that only scrolls downward, became a road you can look back along.

The best a log page can do is make someone willing to scroll it from the beginning.
