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

test("registers the about page and project child route", () => {
  const appSource = readSource("App.jsx");

  assert.match(appSource, /path="about"/);
  assert.match(appSource, /path="about\/projects\/:projectId"/);
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

test("themes the moments and friends footer for their page palettes", () => {
  const footerSource = readSource("components/Footer.jsx");

  assert.match(footerSource, /moments:\s*\{/);
  assert.match(footerSource, /friends:\s*\{/);
  assert.match(footerSource, /pathname\.startsWith\("\/moments"\)/);
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
