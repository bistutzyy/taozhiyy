---
date: 2026-11-01
slug: site-growth-20-home-covers-bili-videos
title_zh: 建站成长记录 20｜四景预览、个人投稿与首页换景
title_en: Site Growth Log 20 | Four Views, Personal Videos, and Home Covers
excerpt_zh: 首页加入不规则 2x2 壁纸预览与手机四选一，移除亮度入口，控制台右下角改为切换封面；新标签页首访显示 wallpaper1，刷新随机。哔哩哔哩页新增个人投稿与按需播放器，自动同步仍待就绪。
excerpt_en: Irregular 2x2 wallpaper previews and a mobile four-choice picker accompany simpler cover controls. A new tab starts with wallpaper1; refreshes choose randomly. Personal Bili videos appear above the anime tracker with an on-demand player, while production sync remains pending.
words: 580
reads: 0
minutes: 3
---

# 建站成长记录 20：四幅风景，一起看见

这次把首页选景和个人投稿一起补进记录，也把已经可用的展示与尚待验证的自动同步分开说明。

## 四景同屏，手机直接四选一

封面预览区改成不规则 2x2 四分屏，四幅壁纸同时呈现。悬停或键盘聚焦时，对应画面会高亮，选中后再应用到首页。

手机采用四选一布局，轻触即可选择，不依赖悬停。不同尺寸的屏幕都能先看清候选画面，再决定留下哪一幅。

## 换景入口收拢，首次到访有固定开场

这一轮移除亮度调节入口，控制台右下角改为“切换封面”，直接打开选景器。

每个新标签页的浏览会话首次进入首页时，固定显示第一张壁纸 wallpaper1；同一标签页刷新随机换景。首次开场与刷新规则分开，不再把每次进入都写成随机。

## 个人投稿放在追番之前

哔哩哔哩页在追番区域上方新增“我的视频”，展示个人投稿的封面、标题、时长和发布时间，也保留前往 B 站观看的链接。

播放器按需加载：点击视频封面后才打开弹层并加载 B 站播放器，关闭后移除，首屏不预先加载第三方播放器。

## 展示可用，不等于自动抓取已完成

个人视频展示与同步代码已随 PR #74 合入（`af0764cf`），但生产接口 `/api/v1/bili/videos` 当前仍返回 `ready: false`，自动抓取尚未验证成功。

目前页面展示已收录视频作为回退，并提示等待首次同步。这里记录的是展示和播放器已经接入，不把回退内容当作生产自动同步成功的证明。

---en---

# Site Growth Log 20: Four Landscapes in One View

This update records the home cover refinements and personal video display, while keeping the working presentation separate from pending production sync.

## Four previews, with direct choices on mobile

The wallpaper preview uses an irregular 2x2 layout to show all four images together. Hovering or focusing a choice highlights its corresponding panel; selecting it applies the cover to the homepage.

Phones use a four-choice picker with direct tap selection, without depending on hover. The candidates stay visible before a choice is made.

## Simpler controls and a consistent opening

Brightness controls are removed in this refinement. The bottom-right console control becomes Switch Cover and opens the picker directly.

The first homepage visit in each new tab's browsing session starts with the first image, wallpaper1. Refreshing that tab chooses a random cover. The initial visit and refresh now follow separate rules rather than making every arrival random.

## Personal uploads before the anime tracker

The Bilibili page adds My Videos above the anime tracker, with cover images, titles, durations, publication dates, and links to watch on Bilibili.

An on-demand player opens only after a video cover is clicked. Closing the dialog removes the embedded player, so the initial page does not load a third-party player in advance.

## A working display is not proof of ingestion

The personal video display and sync code were merged in PR #74 (`af0764cf`). However, the production endpoint `/api/v1/bili/videos` currently returns `ready: false`; automatic ingestion has not been verified as successful.

The page currently uses the known-video fallback and indicates that the first sync is pending. This records the display and player integration, not a claim that production automatic sync has succeeded.
