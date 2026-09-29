import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { rewriteAboutPreviewAssets } from "./aboutPreviewAssets.js";

test("rewrites direct COS URLs in the about preview to the same-origin proxy", () => {
  const html = `
    <img src="https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/about-page/demo.jpg" alt="">
    <a href="https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/about-page/demo.svg">asset</a>
    <span style="background-image:url('https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/about-page/demo.webp')"></span>
  `;

  const rewritten = rewriteAboutPreviewAssets(html);

  assert.doesNotMatch(rewritten, /cos\.ap-beijing\.myqcloud\.com/);
  assert.match(rewritten, /src="\/cos\/about-page\/demo\.jpg"/);
  assert.match(rewritten, /href="\/cos\/about-page\/demo\.svg"/);
  assert.match(rewritten, /url\('\/cos\/about-page\/demo\.webp'\)/);
});

test("keeps the original about site thumbnails on the COS proxy", () => {
  const html = `
    <img src="/cos/about-page/20260624/sites-taozhiyy-3616e0f19f.jpg" alt="taozhiyy.top">
    <img src="/cos/about-page/20260624/sites-butterfly-3b2fb61396.jpg" alt="bistutzyy.github.io">
    <img src="/cos/about-page/20260624/sites-reimu-a3d1934027.jpg" alt="blog1-reimu.vercel.app">
    <img src="/cos/about-page/20260624/sites-tzyy11-41ead66835.jpg" alt="tzyy11.vercel.app">
  `;

  const rewritten = rewriteAboutPreviewAssets(html);

  assert.match(rewritten, /src="\/cos\/about-page\/20260624\/sites-taozhiyy-3616e0f19f\.jpg"/);
  assert.match(rewritten, /src="\/cos\/about-page\/20260624\/sites-butterfly-3b2fb61396\.jpg"/);
  assert.match(rewritten, /src="\/cos\/about-page\/20260624\/sites-reimu-a3d1934027\.jpg"/);
  assert.match(rewritten, /src="\/cos\/about-page\/20260624\/sites-tzyy11-41ead66835\.jpg"/);
  assert.doesNotMatch(rewritten, /\/img\/about-sites\//);
});

test("forces eager loading for every image to fix shadow DOM visibility", () => {
  const html = `
    <img class="cover" src="/cos/about-page/demo.jpg" alt="demo">
    <img loading="lazy" decoding="sync" src="/cos/about-page/hero.jpg" alt="hero">
  `;

  const rewritten = rewriteAboutPreviewAssets(html);

  assert.match(rewritten, /<img loading="eager" decoding="async" referrerpolicy="no-referrer" class="cover"/);
  assert.match(rewritten, /<img referrerpolicy="no-referrer" loading="eager" decoding="sync" src="\/cos\/about-page\/hero\.jpg"/);
});

test("forces eager loading for marquee tech-pill icons alongside other images", () => {
  const html = `
    <span class="tech-pill"><img class="ti" src="/cos/about-page/simpleicon-react.svg" alt=""/>React</span>
    <span class="tech-pill"><img class="ti ti-emoji" style="background:#fff">emoji</span>
    <img class="cover-img" src="/cos/about-page/cover.jpg" alt=""/>
  `;

  const rewritten = rewriteAboutPreviewAssets(html);

  assert.match(rewritten, /<img loading="eager" decoding="async" referrerpolicy="no-referrer" class="ti" src="\/cos\/about-page\/simpleicon-react\.svg"/);
  assert.match(rewritten, /<img loading="eager" decoding="async" referrerpolicy="no-referrer" class="cover-img"/);
});


test("strips inline onerror handlers and adds referrerpolicy for shadow DOM safety", () => {
  const html = `
    <img class="slot-image" src="/cos/about-page/game.jpg" alt="game" onerror="this.style.display='none'"/>
    <img class="slot-blur" src="/cos/about-page/game.jpg" alt="" onerror="this.style.display='none'"/>
  `;

  const rewritten = rewriteAboutPreviewAssets(html);

  assert.doesNotMatch(rewritten, /onerror/);
  assert.match(rewritten, /referrerpolicy="no-referrer"/);
});

test("keeps the original Genshin image visible instead of hiding it after a transient error", () => {
  const html = `
    <img loading="lazy" decoding="async" class="slot-image" src="/cos/about-page/20260624/games-genshin.jpg-card-4f646b6651.jpg" alt="原神" onerror="this.style.display='none'" />
  `;

  const rewritten = rewriteAboutPreviewAssets(html);

  assert.match(rewritten, /src="\/cos\/about-page\/20260624\/games-genshin\.jpg-card-4f646b6651\.jpg"/);
  assert.match(rewritten, /loading="eager"/);
  assert.match(rewritten, /referrerpolicy="no-referrer"/);
  assert.doesNotMatch(rewritten, /onerror/);
});

test("keeps the local Vite server aligned with the production COS proxy path", () => {
  const viteConfig = readFileSync(resolve("vite.config.js"), "utf8");

  assert.match(viteConfig, /["']\/cos["']\s*:/);
  assert.match(viteConfig, /tzyy-1330068502\.cos\.ap-beijing\.myqcloud\.com/);
  assert.ok(viteConfig.includes('rewrite: (path) => path.replace(/^\\/cos/, "")'));
});

test("uses asset rewriting before mounting the about preview markup", () => {
  const routeSource = readFileSync(resolve("src/pages/AboutSitePage.jsx"), "utf8");

  assert.match(routeSource, /import \{ rewriteAboutPreviewAssets \}/);
  assert.match(routeSource, /return rewriteAboutPreviewAssets\(`/);
});

test("fetches the about preview with a versioned no-store request", () => {
  const routeSource = readFileSync(resolve("src/pages/AboutSitePage.jsx"), "utf8");

  assert.match(routeSource, /ABOUT_PREVIEW_VERSION/);
  assert.match(routeSource, /new URLSearchParams\(\{ v: ABOUT_PREVIEW_VERSION \}\)/);
  assert.match(routeSource, /fetch\(getAboutPreviewUrl\(\), \{ cache: "no-store" \}\)/);
});

test("about preview source eagerly loads remaining image assets", () => {
  const previewHtml = readFileSync(resolve("public/about-preview.html"), "utf8");

  assert.doesNotMatch(previewHtml, /loading="lazy"/);
  assert.doesNotMatch(previewHtml, /onerror="this\.style\.display='none'"/);
  assert.match(previewHtml, /simpleicon-react-61dafb-7c601a5c00\.svg/);
  assert.doesNotMatch(previewHtml, /games-genshin\.jpg-card-4f646b6651\.jpg/);
});

test("about preview no longer shows the games and site readme sections", () => {
  const previewHtml = readFileSync(resolve("public/about-preview.html"), "utf8");

  assert.doesNotMatch(previewHtml, /我玩的游戏/);
  assert.doesNotMatch(previewHtml, /本站说明/);
  assert.doesNotMatch(previewHtml, /game-shelf/);
  assert.doesNotMatch(previewHtml, /readme/);
});
