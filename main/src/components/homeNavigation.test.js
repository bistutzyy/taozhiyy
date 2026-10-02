import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (path) => readFileSync(resolve(sourceRoot, path), "utf8");

test("merges gallery and moments into one glimmer navbar entry", () => {
  const navbarSource = readSource("components/Navbar.jsx");
  const appSource = readSource("App.jsx");
  const glimmerSource = readSource("pages/GlimmerPage.jsx");

  assert.match(navbarSource, /\{\s*label:\s*"浮光集",\s*to:\s*"\/glimmer"/);
  assert.doesNotMatch(navbarSource, /label:\s*"相册集"/);
  assert.doesNotMatch(navbarSource, /label:\s*"碎语"/);
  assert.match(appSource, /path="glimmer" element={<GlimmerPage \/>}/);
  assert.match(appSource, /path="gallery" element={<Navigate to="\/glimmer" replace \/>}/);
  assert.match(appSource, /path="moments" element={<Navigate to="\/glimmer" replace \/>}/);
  assert.match(glimmerSource, /<h1>浮光集<\/h1>/);
  assert.match(glimmerSource, /galleryAlbums\.map/);
  assert.match(glimmerSource, /moments\.map/);
  assert.doesNotMatch(glimmerSource, /柔软的手札/);
  assert.doesNotMatch(glimmerSource, /数据中心/);
});

test("keeps the about entry in the top navbar", () => {
  const navbarSource = readSource("components/Navbar.jsx");

  assert.match(navbarSource, /\{\s*label:\s*"关于我",\s*to:\s*"\/about"/);
});

test("gives about, glimmer, bili, and friends distinct seasonal backgrounds", () => {
  const aboutSource = readSource("pages/AboutSitePage.jsx");
  const glimmerSource = readSource("pages/GlimmerPage.jsx");
  const biliSource = readSource("pages/BiliHubPage.jsx");
  const friendsSource = readSource("pages/FriendsPage.jsx");
  const cssSource = readSource("index.css");

  assert.match(aboutSource, /about-route-page seasonal-page seasonal-page--spring/);
  assert.match(glimmerSource, /glimmer-page seasonal-page seasonal-page--summer/);
  assert.match(biliSource, /bili-hub-page seasonal-page seasonal-page--autumn/);
  assert.match(friendsSource, /friends-page seasonal-page seasonal-page--winter/);
  assert.match(cssSource, /\.seasonal-page::before/);
  assert.match(cssSource, /\.seasonal-page--spring/);
  assert.match(cssSource, /\.seasonal-page--summer/);
  assert.match(cssSource, /\.seasonal-page--autumn/);
  assert.match(cssSource, /\.seasonal-page--winter/);
});

test("uses recognizable seasonal objects instead of color swaps", () => {
  const aboutSource = readSource("pages/AboutSitePage.jsx");
  const glimmerSource = readSource("pages/GlimmerPage.jsx");
  const biliSource = readSource("pages/BiliHubPage.jsx");
  const friendsSource = readSource("pages/FriendsPage.jsx");
  const cssSource = readSource("index.css");

  assert.match(aboutSource, /seasonal-scene--spring/);
  assert.match(glimmerSource, /seasonal-scene--summer/);
  assert.match(biliSource, /seasonal-scene--autumn/);
  assert.match(friendsSource, /seasonal-scene--winter/);
  assert.match(cssSource, /\.spring-petal/);
  assert.match(cssSource, /\.sakura-petal-field/);
  assert.match(cssSource, /\.sakura-petal--eighteen/);
  assert.match(cssSource, /\.summer-ocean-stage/);
  assert.match(cssSource, /\.summer-ocean-video/);
  assert.match(cssSource, /\.summer-ocean-overlay/);
  assert.match(cssSource, /\.autumn-recipes-shell/);
  assert.match(cssSource, /\.autumn-wave-stage/);
  assert.match(cssSource, /\.autumn-recipe-card/);
  assert.match(cssSource, /\.winter-snowfall-field/);
  assert.match(cssSource, /\.winter-floating-snow/);
  assert.match(cssSource, /@keyframes\s+winterSnowFloat/);
});

test("unifies seasonal page headers with matching seasonal treatments", () => {
  const aboutSource = readSource("pages/AboutSitePage.jsx");
  const glimmerSource = readSource("pages/GlimmerPage.jsx");
  const friendsSource = readSource("pages/FriendsPage.jsx");
  const cssSource = readSource("index.css");

  assert.doesNotMatch(aboutSource, /Spring Profile|seasonal-hero--spring/);
  assert.match(glimmerSource, /seasonal-hero seasonal-hero--summer/);
  assert.match(friendsSource, /seasonal-hero seasonal-hero--winter/);
  assert.match(cssSource, /\.seasonal-hero/);
  assert.match(cssSource, /\.seasonal-hero__kicker/);
  assert.match(cssSource, /\.seasonal-hero__title/);
  assert.match(cssSource, /\.seasonal-hero__text/);
  assert.match(cssSource, /\.seasonal-hero--summer::after/);
  assert.match(cssSource, /\.seasonal-hero--winter::after/);
});

test("removes the bili seasonal hero copy and proportionally scales the original bangumi cards", () => {
  const biliSource = readSource("pages/BiliHubPage.jsx");
  const acgSource = readSource("components/AcgNavigation.jsx");
  const cssSource = readSource("index.css");

  assert.doesNotMatch(biliSource, /Autumn Garden|Bili Season|Warm maple light/);
  assert.doesNotMatch(biliSource, /seasonal-hero seasonal-hero--autumn/);
  assert.match(acgSource, /bangumi-mini-grid/);
  assert.match(acgSource, /bangumi-mini-card/);
  assert.match(acgSource, /rounded-2xl/);
  assert.match(acgSource, /repeat\(auto-fill,\s*minmax\(150px,\s*180px\)\)/);
  assert.doesNotMatch(acgSource, /bangumi-polaroid/);
  assert.match(cssSource, /\.bangumi-mini-grid/);
  assert.match(cssSource, /\.bangumi-mini-card/);
  assert.match(cssSource, /\.bangumi-mini-card\s*\{[\s\S]*?max-width:\s*180px/);
  assert.doesNotMatch(cssSource, /\.bangumi-polaroid|--bangumi-tilt/);
});

test("removes the creator radar section from the bili page", () => {
  const acgNavigationSource = readSource("components/AcgNavigation.jsx");

  assert.doesNotMatch(acgNavigationSource, /作者再看/);
  assert.doesNotMatch(acgNavigationSource, /Creator radar/i);
  assert.doesNotMatch(acgNavigationSource, /Open Bilibili/i);
  assert.doesNotMatch(acgNavigationSource, /getRadarFeed/);
  assert.doesNotMatch(acgNavigationSource, /RadarCard/);
});

test("adds an ocean-style dynamic backdrop to the summer glimmer page", () => {
  const glimmerSource = readSource("pages/GlimmerPage.jsx");
  const cssSource = readSource("index.css");

  assert.match(glimmerSource, /summer-ocean-stage/);
  assert.match(glimmerSource, /summer-ocean-media/);
  assert.match(glimmerSource, /"\/seasonal\/ocean"/);
  assert.match(glimmerSource, /<video/);
  assert.match(glimmerSource, /ocean\.mp4/);
  assert.match(glimmerSource, /ocean\.webm/);
  assert.match(glimmerSource, /overlay-hero\.png/);
  for (const asset of ["ocean.mp4", "ocean.webm", "ocean.png", "overlay-hero.png"]) {
    assert.equal(existsSync(resolve(sourceRoot, `../public/seasonal/ocean/${asset}`)), true);
  }
  assert.match(cssSource, /\.summer-ocean-stage/);
  assert.match(cssSource, /\.summer-ocean-media/);
  assert.match(cssSource, /\.summer-ocean-video/);
  assert.match(cssSource, /\.summer-ocean-frame/);
  assert.match(cssSource, /\.summer-ocean-overlay/);
  assert.match(cssSource, /\.summer-ocean-stage\s*\{[\s\S]*?min-height:\s*100dvh/);
});

test("uses the ocean video as the full summer background without leftover widgets", () => {
  const glimmerSource = readSource("pages/GlimmerPage.jsx");
  const cssSource = readSource("index.css");

  assert.doesNotMatch(glimmerSource, /glimmer-page-bg|glimmer-page-glow/);
  assert.doesNotMatch(glimmerSource, /summer-light-frame|summer-wave-ribbon|summer-ripple|summer-bubble|summer-sun-strip/);
  assert.doesNotMatch(cssSource, /\.glimmer-page-bg|\.glimmer-page-glow/);
  assert.doesNotMatch(cssSource, /\.summer-light-frame|\.summer-wave-ribbon|\.summer-ripple|\.summer-bubble|\.summer-sun-strip/);
  assert.match(cssSource, /\.summer-ocean-stage\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(cssSource, /\.summer-ocean-stage\s*\{[\s\S]*?inset:\s*0/);
  assert.match(cssSource, /\.summer-ocean-stage\s*\{[\s\S]*?min-height:\s*100dvh/);
  assert.match(cssSource, /\.summer-ocean-video\s*\{[\s\S]*?filter:\s*brightness\(1\.[0-9]+\)\s+saturate\(0\.[0-9]+\)/);
  assert.match(cssSource, /\.glimmer-page-hero\.seasonal-hero--summer\s*\{[\s\S]*?min-height:\s*clamp\(22rem,\s*44vh,\s*34rem\)/);
  assert.doesNotMatch(cssSource, /\.glimmer-page-hero\.seasonal-hero--summer\s*\{[\s\S]*?min-height:\s*90vh/);
  assert.match(cssSource, /\.glimmer-albums,\s*\n\.glimmer-notes\s*\{[\s\S]*?background-color:\s*rgba\(255,\s*255,\s*255,\s*0\.06\)/);
  assert.match(cssSource, /\.glimmer-albums,\s*\n\.glimmer-notes\s*\{[\s\S]*?backdrop-filter:\s*none/);
});

test("tones the summer page with readable copy and barely-there transparent panels", () => {
  const cssSource = readSource("index.css");

  assert.match(cssSource, /--glimmer-panel-transparent:/);
  assert.doesNotMatch(cssSource, /--glimmer-panel-softlight:/);
  assert.doesNotMatch(cssSource, /--glimmer-panel-glass:/);
  assert.doesNotMatch(cssSource, /--glimmer-titanium/);
  assert.match(cssSource, /\.summer-ocean-video\s*\{[\s\S]*?filter:\s*brightness\(1\.0[0-9]\)\s+saturate\(0\.[0-9]+\)\s+contrast\(0\.[0-9]+\)/);
  assert.match(cssSource, /\.summer-ocean-overlay\s*\{[\s\S]*?rgba\(255,\s*255,\s*255,\s*0\.5[0-9]\)/);
  assert.match(cssSource, /\.glimmer-page-hero\.seasonal-hero--summer h1\s*\{[\s\S]*?color:\s*rgba\(37,\s*74,\s*93,\s*0\.9[0-9]\)/);
  assert.match(cssSource, /\.glimmer-page-hero\.seasonal-hero--summer \.glimmer-page-subtitle\s*\{[\s\S]*?color:\s*rgba\(43,\s*80,\s*98,\s*0\.8[0-9]\)/);
  assert.match(cssSource, /\.glimmer-albums,\s*\n\.glimmer-notes\s*\{[\s\S]*?background:\s*var\(--glimmer-panel-transparent\)/);
  assert.match(cssSource, /\.glimmer-albums,\s*\n\.glimmer-notes\s*\{[\s\S]*?border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.24\)/);
  assert.match(cssSource, /\.glimmer-albums,\s*\n\.glimmer-notes\s*\{[\s\S]*?background-color:\s*rgba\(255,\s*255,\s*255,\s*0\.06\)/);
  assert.match(cssSource, /\.glimmer-albums,\s*\n\.glimmer-notes\s*\{[\s\S]*?backdrop-filter:\s*none/);
  assert.doesNotMatch(cssSource, /--glimmer-holo-ring:/);
  assert.match(cssSource, /\.glimmer-albums::before,\s*\n\.glimmer-notes::before\s*\{[\s\S]*?content:\s*none/);
  assert.match(cssSource, /\.glimmer-albums::after,\s*\n\.glimmer-notes::after\s*\{[\s\S]*?content:\s*none/);
});

test("removes the friends intro frame and makes winter snow dense and faster", () => {
  const friendsSource = readSource("pages/FriendsPage.jsx");
  const cssSource = readSource("index.css");

  assert.match(friendsSource, /friends-winter-hero--frameless/);
  assert.match(friendsSource, /风会替信纸赶路/);
  assert.match(friendsSource, /Array\.from\(\{\s*length:\s*42\s*\}/);
  assert.doesNotMatch(friendsSource, /winterLargeSnowflakes/);
  assert.match(friendsSource, /winterSnowflakes\.map/);
  assert.match(friendsSource, /className="winter-floating-snow"/);
  assert.doesNotMatch(friendsSource, /winter-floating-snow winter-floating-snow--large/);
  assert.match(cssSource, /\.friends-winter-hero--frameless\s*\{[\s\S]*?border:\s*0/);
  assert.match(cssSource, /\.friends-winter-hero--frameless\s*\{[\s\S]*?background:\s*transparent/);
  assert.match(cssSource, /\.friends-winter-hero--frameless\s*\{[\s\S]*?box-shadow:\s*none/);
  assert.match(cssSource, /\.winter-floating-snow\s*\{[\s\S]*?left:\s*var\(--snow-left/);
  assert.match(cssSource, /\.winter-floating-snow\s*\{[\s\S]*?animation:\s*winterSnowFloat var\(--snow-duration,\s*10s\)/);
  assert.doesNotMatch(cssSource, /\.winter-floating-snow--large/);
  assert.doesNotMatch(cssSource, /--snow-duration:\s*2[0-9]s/);
});

test("keeps scrolled seasonal navigation matched to each page theme", () => {
  const cssSource = readSource("index.css");

  assert.match(cssSource, /\.floating-nav-about\s*\{[\s\S]*?rgba\(255,\s*232,\s*241,\s*0\.9[0-9]\)/);
  assert.match(cssSource, /\.floating-nav-moments\s*\{[\s\S]*?rgba\(244,\s*253,\s*255,\s*0\.8[0-9]\)/);
  assert.match(cssSource, /\.floating-nav-bili\s*\{[\s\S]*?rgba\(255,\s*244,\s*224,\s*0\.9[0-9]\)/);
  assert.match(cssSource, /\.floating-nav-friends\s*\{[\s\S]*?rgba\(236,\s*248,\s*255,\s*0\.9[0-9]\)/);
  assert.match(cssSource, /\.nav-hover-btn--about::after\s*\{[\s\S]*?background-color:\s*#ff8fab/);
  assert.match(cssSource, /\.nav-hover-btn--moments::after\s*\{[\s\S]*?background-color:\s*#4fbfd1/);
  assert.match(cssSource, /\.nav-hover-btn--bili::after\s*\{[\s\S]*?background-color:\s*#d89145/);
  assert.match(cssSource, /\.nav-hover-btn--friends::after\s*\{[\s\S]*?background-color:\s*#74b8e8/);
});

test("prevents spring summer and autumn from flashing bottom preload backgrounds", () => {
  const cssSource = readSource("index.css");

  assert.match(cssSource, /\.seasonal-page--spring\s*\{[\s\S]*?--season-bg:\s*transparent/);
  assert.match(cssSource, /\.seasonal-page--spring\s*\{[\s\S]*?--season-wash:\s*none/);
  assert.match(cssSource, /\.seasonal-page--spring\s*\{[\s\S]*?--season-thread:\s*none/);
  assert.match(cssSource, /\.seasonal-page--summer\s*\{[\s\S]*?--season-bg:\s*transparent/);
  assert.match(cssSource, /\.seasonal-page--summer\s*\{[\s\S]*?--season-wash:\s*none/);
  assert.match(cssSource, /\.seasonal-page--summer\s*\{[\s\S]*?--season-thread:\s*none/);
  assert.match(cssSource, /\.seasonal-page--autumn\s*\{[\s\S]*?--season-bg:\s*transparent/);
  assert.match(cssSource, /\.seasonal-page--autumn\s*\{[\s\S]*?--season-wash:\s*none/);
  assert.match(cssSource, /\.seasonal-page--autumn\s*\{[\s\S]*?--season-thread:\s*none/);
  assert.match(cssSource, /\.glimmer-page\.seasonal-page--summer\s*\{[\s\S]*?background:\s*transparent/);
  assert.match(cssSource, /\.summer-ocean-media\s*\{[\s\S]*?background:\s*transparent/);
  assert.match(cssSource, /\.glimmer-page\.seasonal-page--summer::before\s*\{[\s\S]*?background:\s*transparent/);
  assert.match(cssSource, /\.glimmer-page\.seasonal-page--summer::before\s*\{[\s\S]*?opacity:\s*0/);
});

test("gives the autumn preview a light autumn recipes inspired background", () => {
  const biliSource = readSource("pages/BiliHubPage.jsx");
  const cssSource = readSource("index.css");

  assert.match(biliSource, /autumn-recipes-shell/);
  assert.doesNotMatch(biliSource, /autumn-recipes-leaf/);
  assert.match(cssSource, /--autumn-paper:\s*#efe3ce/);
  assert.match(cssSource, /--autumn-card:\s*#f7efe0/);
  assert.match(cssSource, /--autumn-pumpkin:\s*#c6622b/);
  assert.match(cssSource, /--autumn-moss:\s*#5b6e4d/);
  assert.match(cssSource, /--autumn-mustard:\s*#d9a441/);
  assert.match(cssSource, /\.autumn-recipes-shell\s*\{[\s\S]*?border:\s*0/);
  assert.match(cssSource, /\.autumn-recipes-shell\s*\{[\s\S]*?background:\s*transparent/);
  assert.match(cssSource, /\.autumn-recipes-shell\s*\{[\s\S]*?box-shadow:\s*none/);
  assert.doesNotMatch(cssSource, /\.autumn-recipes-shell::before|\.autumn-recipes-shell::after/);
  assert.doesNotMatch(cssSource, /\.autumn-recipes-leaf|autumnRecipeLeafFall/);
  assert.match(cssSource, /\.autumn-recipe-card/);
  assert.match(cssSource, /\.bili-hub-page \.bangumi-mini-card\s*\{[\s\S]*?var\(--autumn-card\)/);
  assert.doesNotMatch(biliSource, /autumn-shiro|autumn-paper-grid|autumn-floating-note|autumn-aurora/);
  assert.doesNotMatch(cssSource, /\.autumn-shiro|\.autumn-paper-grid|\.autumn-floating-note|\.autumn-aurora/);
});

test("gives the bili page an autumn wave background in the summer ocean motion", () => {
  const biliSource = readSource("pages/BiliHubPage.jsx");
  const cssSource = readSource("index.css");

  assert.match(biliSource, /autumn-wave-stage/);
  assert.match(biliSource, /autumn-wave autumn-wave--1/);
  assert.match(biliSource, /autumn-wave autumn-wave--4/);
  assert.match(cssSource, /\.autumn-wave-stage\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(cssSource, /\.autumn-wave-stage\s*\{[\s\S]*?inset:\s*0/);
  assert.match(cssSource, /\.autumn-wave\s*\{[\s\S]*?animation:\s*autumnWaveSwell/);
  assert.match(cssSource, /@keyframes\s+autumnWaveSwell\s*\{[\s\S]*?translateX\(-50%\)/);
});

test("keeps the winter preview to floating snow only", () => {
  const friendsSource = readSource("pages/FriendsPage.jsx");
  const cssSource = readSource("index.css");

  assert.match(friendsSource, /winter-snowfall-field/);
  assert.match(friendsSource, /winterSnowflakes\.map/);
  assert.doesNotMatch(friendsSource, /friends-page-backdrop/);
  assert.doesNotMatch(friendsSource, /winter-moon|winter-silver-branch|winter-lace-snowflake|winter-snow-curtain|winter-frost-line/);
  assert.match(cssSource, /\.winter-snowfall-field/);
  assert.match(cssSource, /\.winter-floating-snow/);
});

test("sizes winter snowflakes up and themes friend cards for winter", () => {
  const friendsSource = readSource("pages/FriendsPage.jsx");
  const cssSource = readSource("index.css");

  assert.match(friendsSource, /friends-winter-card/);
  assert.match(friendsSource, /friends-winter-avatar/);
  assert.match(friendsSource, /friends-winter-link-panel/);
  assert.match(friendsSource, /--snow-size/);
  assert.match(friendsSource, /0\.92 \+ \(\(index \* 7\) % 10\) \/ 10/);
  assert.doesNotMatch(friendsSource, /winterLargeSnowflakes/);
  assert.match(cssSource, /content:\s*"❄"/);
  assert.doesNotMatch(cssSource, /\.winter-floating-snow--large/);
  assert.match(cssSource, /\.friends-winter-card/);
  assert.match(cssSource, /\.friends-winter-card::before/);
  assert.match(cssSource, /\.friends-winter-card::after/);
  assert.match(cssSource, /\.friends-winter-avatar/);
  assert.match(cssSource, /\.friends-winter-link-panel/);
  assert.match(cssSource, /\.friends-winter-link-panel__chrome/);
  assert.match(friendsSource, /friends-winter-copy-button/);
  assert.match(cssSource, /\.friends-winter-copy-button\s*\{[\s\S]*?margin-left:\s*auto/);
  assert.match(cssSource, /\.friends-winter-link-panel__chrome::after\s*\{[\s\S]*?position:\s*absolute/);
  assert.doesNotMatch(cssSource, /46\.2%\s*46\.8%/);
  assert.doesNotMatch(friendsSource, /border-\[#F0E3D8\]|rgba\(255,248,241/);
});

test("gives the about page a sakura theme with falling petals", () => {
  const aboutSource = readSource("pages/AboutSitePage.jsx");
  const cssSource = readSource("index.css");

  assert.match(aboutSource, /sakura-petal-field/);
  assert.match(aboutSource, /sakura-petal--/);
  assert.doesNotMatch(aboutSource, /spring-garden-frame|spring-blossom-cluster|spring-branch|spring-paper-edge/);
  assert.match(aboutSource, /sakura-petal--eighteen/);
  assert.doesNotMatch(cssSource, /\.spring-garden-frame|\.spring-blossom-cluster|\.spring-branch|\.spring-paper-edge/);
  assert.match(cssSource, /--sakura-pink/);
  assert.match(cssSource, /@keyframes\s+sakuraPetalFall/);
  assert.match(cssSource, /\.sakura-petal-field/);
  assert.match(cssSource, /\.sakura-petal::before/);
  assert.match(cssSource, /\.sakura-petal\s*\{[\s\S]*?animation:\s*sakuraPetalFall var\(--fall-duration,\s*9s\)/);
  assert.match(cssSource, /\.seasonal-page--spring\s*\{[\s\S]*?--season-bg:\s*transparent/);
});

test("moves the data center entry to the homepage follow-up card", () => {
  const navbarSource = readSource("components/Navbar.jsx");
  const storySource = readSource("components/Story.jsx");
  const appSource = readSource("App.jsx");

  assert.doesNotMatch(navbarSource, /label:\s*"数据中心"/);
  assert.doesNotMatch(navbarSource, /to:\s*"\/ai-traffic"/);
  assert.match(appSource, /path="ai-traffic" element={<AiTrafficPage \/>}/);
  assert.match(storySource, /to="\/ai-traffic"/);
  assert.match(storySource, /数据中心/);
  assert.match(storySource, /Real-time server telemetry and AI traffic are collected here/);
  assert.doesNotMatch(storySource, /这里记录服务器状态与 AI 调用流量/);
  assert.doesNotMatch(storySource, /to="\/guestbook"/);
  assert.doesNotMatch(storySource, /Leave a message/);
});

test("keeps the homepage data-center entry readable without button overlap", () => {
  const cssSource = readSource("index.css");
  const signoffBlock = cssSource.match(/\.story-envelope-signoff\s*\{(?<rules>[\s\S]*?)\n  \}/);

  assert.ok(signoffBlock, "missing story envelope signoff CSS block");
  assert.match(signoffBlock.groups.rules, /margin-bottom:\s*clamp\(1\.65rem,\s*2\.6vw,\s*2\.2rem\)/);
  assert.match(cssSource, /\.story-envelope-btn span > div:last-child\s*\{/);
  assert.match(cssSource, /\.story-envelope-btn span > div:last-child\s*\{[\s\S]*?display:\s*none/);
});

test("registers the about page and project child route", () => {
  const appSource = readSource("App.jsx");

  assert.match(appSource, /path="about"/);
  assert.match(appSource, /path="about\/projects\/:projectId"/);
});

test("moves server status into the about page in place of the sites section", () => {
  const aboutPreviewSource = readSource("../public/about-preview.html");
  const aboutPageSource = readSource("pages/AboutSitePage.jsx");
  const trafficSource = readSource("pages/AiTrafficPage.jsx");

  assert.match(aboutPreviewSource, /slot name="server-status"/);
  assert.doesNotMatch(aboutPreviewSource, /我的网站/);
  assert.doesNotMatch(aboutPreviewSource, /class="sites"/);
  assert.match(aboutPageSource, /<ServerInfoPanel \/>/);
  assert.match(aboutPageSource, /slot="server-status"/);
  assert.doesNotMatch(trafficSource, /ServerInfoPanel/);
});

test("keeps the about preview production-safe", () => {
  const aboutPreviewSource = readSource("../public/about-preview.html");

  assert.doesNotMatch(aboutPreviewSource, /预览专用|Preview only/i);
  assert.doesNotMatch(aboutPreviewSource, /cos\.ap-beijing\.myqcloud\.com/);
  assert.match(aboutPreviewSource, /\/cos\/about-page\/20260624\//);
  assert.match(aboutPreviewSource, /href="\/showcase\/quizcard\.html"/);
  assert.doesNotMatch(aboutPreviewSource, /\/about\/projects\/quizcard/);
});

test("keeps the quizcard project page on the deployed showcase page", () => {
  const projectPageSource = readSource("pages/AboutProjectPage.jsx");

  assert.match(projectPageSource, /showcase\/quizcard\.html/);
  assert.doesNotMatch(projectPageSource, /Project Notes|回到项目集|localPreview|127\.0\.0\.1|localhost/i);
});

test("ships the quizcard showcase page and its local assets", () => {
  const showcasePath = "../public/showcase/quizcard.html";
  assert.equal(existsSync(resolve(sourceRoot, showcasePath)), true);

  const showcaseSource = readSource(showcasePath);
  assert.match(showcaseSource, /assets\/showcase\.css/);
  assert.match(showcaseSource, /assets\/showcase\.js/);
  assert.match(showcaseSource, /mp-pages\/login\.html/);
  assert.match(showcaseSource, /\.\.\/web\/index\.html/);
});

test("ships the quizcard visitor app with seed data and all required modules", () => {
  const requiredWebFiles = [
    "../public/web/index.html",
    "../public/web/create.html",
    "../public/web/history.html",
    "../public/web/practice-setup.html",
    "../public/web/practice.html",
    "../public/web/report.html",
    "../public/web/settings.html",
    "../public/web/login.html",
    "../public/web/assets/store.js",
    "../public/web/assets/seed.js",
    "../public/web/assets/shell.js",
    "../public/web/assets/parser.js",
    "../public/web/assets/auth.js",
    "../public/web/assets/settings.js",
    "../public/web/assets/style.css",
  ];

  for (const filePath of requiredWebFiles) {
    assert.equal(existsSync(resolve(sourceRoot, filePath)), true, `${filePath} should be deployed`);
  }

  const storeSource = readSource("../public/web/assets/store.js");
  const seedSource = readSource("../public/web/assets/seed.js");
  const guestPages = [
    "../public/web/index.html",
    "../public/web/create.html",
    "../public/web/history.html",
    "../public/web/practice-setup.html",
    "../public/web/practice.html",
    "../public/web/report.html",
    "../public/web/settings.html",
  ];

  assert.match(storeSource, /from ['"]\.\/seed\.js['"]/);
  assert.match(storeSource, /ensureSeed/);
  assert.match(seedSource, /export const SEED/);
  for (const deckId of ["deck_seed_neuro", "deck_seed_vocab", "deck_seed_physics"]) {
    assert.match(seedSource, new RegExp(deckId));
  }

  for (const pagePath of guestPages) {
    const pageSource = readSource(pagePath);
    assert.match(pageSource, /mountShell\([^;]*requireAuth:\s*false[^;]*\)/s);
  }
});

test("keeps the about projects grid roomy in the integrated site", () => {
  const aboutPreviewSource = readSource("../public/about-preview.html");

  assert.match(aboutPreviewSource, /\.page\s*\{\s*max-width:\s*14[0-9]{2}px/);
  assert.match(aboutPreviewSource, /@media \(min-width:\s*1024px\)\s*\{\s*\.projects\s*\{\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(aboutPreviewSource, /@media \(min-width:\s*14[0-9]{2}px\)\s*\{\s*\.projects\s*\{\s*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
});

test("keeps about, moments, and friends mobile drawer navigation on their page palettes", () => {
  const cssSource = readSource("index.css");

  for (const theme of ["about", "moments", "friends"]) {
    assert.match(cssSource, new RegExp(`\\.nav-mobile-backdrop--${theme}`));
    assert.match(cssSource, new RegExp(`\\.nav-mobile-drawer--${theme}\\s*\\{`));
    assert.match(cssSource, new RegExp(`\\.nav-mobile-drawer--${theme} \\.nav-mobile-drawer-head`));
    assert.match(cssSource, new RegExp(`\\.nav-mobile-drawer--${theme} \\.nav-mobile-close`));
    assert.match(cssSource, new RegExp(`\\.nav-mobile-link--${theme}`));
    assert.match(cssSource, new RegExp(`\\.nav-mobile-link--active-${theme}`));
    assert.match(cssSource, new RegExp(`\\.nav-menu-btn--${theme}`));
  }
});

test("keeps the about game cards compact and fully visible on phones", () => {
  const aboutPreviewSource = readSource("../public/about-preview.html");
  const mobileGameBlock = aboutPreviewSource.match(
    /@media \(max-width:\s*540px\)\s*\{(?<rules>[\s\S]*?)\/\* ============ 5\./,
  );

  assert.ok(mobileGameBlock, "missing mobile game card rules");

  assert.match(
    aboutPreviewSource,
    /@media \(max-width:\s*540px\)\s*\{[\s\S]*?\.game-shelf-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.doesNotMatch(mobileGameBlock.groups.rules, /grid-column:\s*1 \/ -1/);
  assert.match(
    aboutPreviewSource,
    /@media \(max-width:\s*540px\)\s*\{[\s\S]*?\.game-slot\s*\{[\s\S]*?border-radius:\s*0\.85rem/,
  );
  assert.match(
    aboutPreviewSource,
    /@media \(max-width:\s*540px\)\s*\{[\s\S]*?\.game-slot\s*\{[\s\S]*?aspect-ratio:\s*9 \/ 13/,
  );
});

test("keeps the quizcard showcase bounded on phone width", () => {
  const showcaseSource = readSource("../public/showcase/quizcard.html");
  const showcaseCss = readSource("../public/showcase/assets/showcase.css");
  const quizcardCss = readSource("../public/web/assets/style.css");
  const shellSource = readSource("../public/web/assets/shell.js");

  assert.match(showcaseSource, /src="\.\.\/web\/index\.html\?embed=showcase"/);
  assert.match(shellSource, /embed-showcase/);

  assert.match(
    showcaseCss,
    /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.tg-page\s*\{[\s\S]*?padding:\s*48px 14px 72px/,
  );
  assert.match(
    showcaseCss,
    /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.tg-demo\s*\{[\s\S]*?gap:\s*18px/,
  );
  assert.match(
    showcaseCss,
    /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.tg-demo-pc \.frame\s*\{[\s\S]*?height:\s*min\(560px,\s*118vw\)/,
  );
  assert.match(
    showcaseCss,
    /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.iphone\s*\{[\s\S]*?width:\s*min\(100%,\s*260px\)/,
  );
  assert.match(
    quizcardCss,
    /html\.embed-showcase \.nav-mobile\s*\{[\s\S]*?display:\s*none\s*!important/,
  );
  assert.match(
    quizcardCss,
    /html\.embed-showcase \.page\s*\{[\s\S]*?padding:\s*64px 12px 18px/,
  );
  assert.match(
    quizcardCss,
    /@media \(max-width:\s*520px\)\s*\{[\s\S]*?\.page\s*\{[\s\S]*?padding:\s*68px 12px calc\(env\(safe-area-inset-bottom,\s*0\) \+ 88px\)/,
  );
  assert.match(
    quizcardCss,
    /@media \(max-width:\s*520px\)\s*\{[\s\S]*?\.deck-card\s*\{[\s\S]*?padding:\s*14px/,
  );
  assert.match(
    quizcardCss,
    /@media \(max-width:\s*520px\)\s*\{[\s\S]*?\.deck-card \.footer\s*\{[\s\S]*?align-items:\s*stretch/,
  );
});

test("keeps the AI data-center layout compact on phones", () => {
  const cssSource = readSource("index.css");
  const aiTrafficSource = readSource("pages/AiTrafficPage.jsx");
  const serverInfoSource = readSource("components/ServerInfoPanel.jsx");

  assert.match(aiTrafficSource, /overflow-x-hidden/);
  assert.match(aiTrafficSource, /ai-stat-grid/);
  assert.match(serverInfoSource, /server-info-panel/);
  assert.match(serverInfoSource, /server-info-grid/);
  assert.match(serverInfoSource, /server-hud-card/);
  assert.match(
    cssSource,
    /@media \(max-width:\s*639px\)\s*\{[\s\S]*?\.server-info-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(
    cssSource,
    /@media \(max-width:\s*639px\)\s*\{[\s\S]*?\.server-hud-card\s*\{[\s\S]*?max-width:\s*11\.5rem/,
  );
});

test("keeps quizcard settings actions safe for visitors", () => {
  const settingsSource = readSource("../public/web/settings.html");

  assert.match(settingsSource, /const accountLabel = u \? u\.email : 'guest';/);
  assert.match(settingsSource, /const accountId = u \? u\.id : 'guest';/);
  assert.doesNotMatch(settingsSource, /quizcard-backup-\$\{u\.email\}/);
  assert.doesNotMatch(settingsSource, /localStorage\.removeItem\('quizcard\.' \+ u\.id \+ '\.usage'\)/);
});

test("names the moments page 碎语", () => {
  const momentsPageSource = readSource("pages/MomentsPage.jsx");

  assert.match(momentsPageSource, /<h1>碎语<\/h1>/);
  assert.match(
    momentsPageSource,
    /<p className="moments-page-subtitle">过往的点点滴滴，且随风而去吧<\/p>/
  );
  assert.doesNotMatch(momentsPageSource, /<h1>说说<\/h1>/);
});

test("renders moments with varied visual modules", () => {
  const momentsPageSource = readSource("pages/MomentsPage.jsx");
  const cssSource = readSource("index.css");

  assert.match(momentsPageSource, /moments-module--\$\{moment\.module\}/);
  for (const module of ["photo", "postcard", "ticket", "watercolor", "poem", "journal", "ribbon"]) {
    assert.match(cssSource, new RegExp(`\\.moments-module--${module}`));
  }
});

test("keeps varied moments modules in one balanced multicolor holographic card family", () => {
  const cssSource = readSource("index.css");
  const moduleNames = ["photo", "postcard", "ticket", "watercolor", "poem", "journal", "ribbon"];
  const toneNames = ["rainbow", "aurora", "ticket", "watercolor", "mist", "journal", "mint"];

  assert.match(cssSource, /--moment-holo:/);
  assert.match(cssSource, /--moment-holo-mint:/);
  assert.match(cssSource, /--moment-holo-blue:/);
  assert.match(cssSource, /--moment-holo-sun:/);
  assert.match(cssSource, /--moment-holo-lavender:/);
  assert.match(cssSource, /--moment-holo-rainbow:/);

  for (const module of moduleNames) {
    const moduleBlock = cssSource.match(
      new RegExp(`\\.moments-module--${module} \\{(?<rules>[\\s\\S]*?)\\n\\}`)
    );

    assert.ok(moduleBlock, `missing CSS block for ${module}`);
    assert.doesNotMatch(moduleBlock.groups.rules, /--moment-width|--moment-margin-left|--moment-margin-right/);
  }

  for (const tone of toneNames) {
    const toneBlock = cssSource.match(
      new RegExp(`\\.moments-card--${tone} \\{(?<rules>[\\s\\S]*?)\\n\\}`)
    );

    assert.ok(toneBlock, `missing tone CSS block for ${tone}`);
    assert.match(toneBlock.groups.rules, /--moment-holo:\s*var\(--moment-holo-/);
    assert.match(toneBlock.groups.rules, /--moment-accent:/);
  }
});

test("renders optional moment images as safe React image elements", () => {
  const momentsPageSource = readSource("pages/MomentsPage.jsx");
  const cssSource = readSource("index.css");
  const photoBlock = cssSource.match(/\.moments-photo \{(?<rules>[\s\S]*?)\n\}/);

  assert.match(momentsPageSource, /\{moment\.image && \(/);
  assert.match(momentsPageSource, /src=\{moment\.image\.src\}/);
  assert.match(momentsPageSource, /alt=\{moment\.image\.alt\}/);
  assert.match(momentsPageSource, /loading="lazy"/);
  assert.match(cssSource, /\.moments-photo/);
  assert.ok(photoBlock, "missing moments photo CSS block");
  assert.match(photoBlock.groups.rules, /width:\s*clamp\(5\.2rem,\s*15vw,\s*6\.6rem\)/);
  assert.doesNotMatch(photoBlock.groups.rules, /30rem|100%/);
});

test("does not put the moments entry in feature five", () => {
  const featuresSource = readSource("components/Features.jsx");

  assert.doesNotMatch(featuresSource, /to="\/moments"/);
  assert.doesNotMatch(featuresSource, /说说入口|碎语入口|进入碎语|进入碎碎念/);
});

test("routes homepage fragment 02 to the external blog", () => {
  const featuresSource = readSource("components/Features.jsx");

  assert.match(featuresSource, /linkUrl:\s*"https:\/\/bistutzyy\.github\.io\/"/);
  assert.match(featuresSource, /linkUrl="https:\/\/bistutzyy\.github\.io\/"/);
  assert.doesNotMatch(featuresSource, /linkUrl[:=]\s*["']\/blog\/["']/);
});

test("does not render moments as a separate homepage section", () => {
  const homePageSource = readSource("pages/HomePage.jsx");

  assert.doesNotMatch(homePageSource, /MomentsHome/);
});

test("themes the seasonal page footers for their page palettes", () => {
  const footerSource = readSource("components/Footer.jsx");

  assert.match(footerSource, /spring:\s*\{/);
  assert.match(footerSource, /summer:\s*\{/);
  assert.match(footerSource, /autumn:\s*\{/);
  assert.match(footerSource, /winter:\s*\{/);
  assert.match(footerSource, /pathname\.startsWith\("\/about"\)/);
  assert.match(footerSource, /pathname\.startsWith\("\/glimmer"\)/);
  assert.match(footerSource, /pathname\.startsWith\("\/bili"\)/);
  assert.match(footerSource, /pathname\.startsWith\("\/friends"\)/);
});

test("keeps quizcard report summary card from overlaying reviews on narrow screens", () => {
  const reportSource = readSource("../public/web/report.html");
  const baseStyles = reportSource.split("@media (min-width: 880px)")[0];

  assert.match(reportSource, /\.summary-card\s*\{/);
  assert.doesNotMatch(baseStyles, /position:\s*sticky/);
  assert.match(
    reportSource,
    /@media \(min-width:\s*880px\)\s*\{[\s\S]*?\.summary-card\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*88px;[\s\S]*?\}/,
  );
});
