---
date: 2026-10-31
slug: site-growth-19-folding-fan-covers
title_zh: 建站成长记录 19｜让首页封面从折扇里展开
title_en: Site Growth Log 19 | Unfolding the Home Cover
excerpt_zh: 首页封面切换改为扇面画屏。四幅原有封面沿扇骨展开，悬停预览、点选铺满，配上短暂的花瓣与流苏动效；调光、随机换景和纯净观赏也收在同一处。
excerpt_en: The home cover picker becomes a folding fan. Four existing images spread from a shared pivot, preview on hover, and expand on selection, alongside brief petals, brightness controls, random selection, and clean view.
words: 760
reads: 0
minutes: 4
---

# 建站成长记录 19：从扇页里展开一幅风景

首页的四幅封面没有更换，这次改的是选景的方式。打开“切换封面”，原先的指南针变成一面扇面画屏：四片画面沿同一个扇轴展开，细金边、桃字小印和流苏留下轻巧的东方气质。

## 经过时预览，选中才留下

鼠标经过扇页时，当前画面会舒展，并在背景里预览；键盘移动焦点也能预览。点击、轻触或按 Enter，才会把选中的封面应用到首页。

选中后，画面从那一片扇页的位置向外展开，直到铺满屏幕。短暂的花瓣与流苏摆动跟着收尾，不会在页面上持续堆积装饰。退出而不选择，则回到原来的封面。

## 换景之外，还能调一调光

工具栏保留随机换景，亮度可以在 70% 到 115% 之间调整，也可以一键恢复到 100%。亮度只作用于封面图片，不影响文字和按钮的清晰度。

纯净观赏会收起扇面和工具栏，让完整图片单独呈现。按 Escape 先退出观赏，再按一次才关闭选景器。只有明确应用后，封面和亮度偏好才会保存；取消不会改掉原来的选择。

## 好看的动效，也要能安静下来

手机上缩小展开幅度，保留直接轻触选择，不依赖悬停。图片还没有准备好或加载失败时，不让空白画面被选中，并提供重试入口。

如果系统开启减少动态效果，应用封面会跳过展开与花瓣动画。即使浏览器不允许保存偏好，当前访问里的选择仍然可以正常使用。

控制台更新日志与创造纪事时间轴也同步记下这次换景，让首页的变化有迹可循。

## 星空也从静止变成缓慢流动

同次更新还调整了奇想馆：星空默认开启缓慢环看，可以手动暂停或继续。滚动、拖动和聚焦项目时暂时让位，操作结束后恢复；手动暂停后，不会因浏览项目而自动开启。切到目录、打开详情或切到后台时停止渲染，回到星空后沿用本次选择。系统开启减少动态效果时仍默认静止。

---en---

# Site Growth Log 19: A Landscape Unfolds from a Fan

The four homepage images remain unchanged. This release changes how they are selected: the old compass gives way to a folding fan. Four image leaves share a pivot, with fine gold edges, a small peach seal, and a tassel.

## Preview first, choose deliberately

Hovering over a leaf widens it and previews its image behind the picker. Keyboard focus offers the same preview. A click, tap, or Enter explicitly applies the selected image.

The image expands from the chosen leaf to fill the viewport. A brief petal flourish and tassel swing finish the transition rather than leaving permanent decoration on the page. Closing without choosing restores the existing cover.

## Light and a quieter view

The toolbar keeps random selection and adds brightness from 70% to 115%, with a reset to 100%. This adjustment affects only cover images, not interface text or buttons.

Clean view hides the fan and controls so the complete image can be seen on its own. Escape leaves clean view first; pressing it again closes the picker. Only an explicit application saves the cover and brightness preferences. Canceling preserves the previous choice.

## Motion with an off switch

On phones, the spread is narrower and selection works through a direct tap rather than hover. Images that are still loading or have failed cannot be selected; failed images have a retry control.

Reduced-motion preferences skip the expanding transition and petals. If browser storage is unavailable, selection still works for the current visit.

The console update log and growth timeline now record this release together.

## A gently moving starfield

Project Cosmos also starts with slow automatic orbiting, with explicit pause and resume controls. Browsing or focusing a project temporarily yields the camera before motion resumes. A manual pause stays in effect while browsing. Rendering pauses in the catalogue, project reader, or a hidden browser tab, then follows the current motion choice on return. Reduced-motion preferences keep automatic movement off.
