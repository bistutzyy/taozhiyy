import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getHeroCoverSrc } from "./heroCoverAssets.js";

const heroSource = readFileSync(new URL("./Hero.jsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const wordmarkSource = readFileSync(
  new URL("./HeroWordmark.jsx", import.meta.url),
  "utf8"
);

test("keeps the fixed-height hero shell from becoming a vertical scroll container", () => {
  assert.match(
    heroSource,
    /className="relative h-dvh w-screen overflow-hidden"/
  );
  assert.doesNotMatch(
    heroSource,
    /className="relative h-dvh w-screen overflow-x-hidden"/
  );
});

test("loads hero media through the same-origin COS proxy", () => {
  assert.match(heroSource, /getHeroCoverSrc as getImgSrc/);
  for (const index of [1, 2, 3, 4]) {
    const source = new URL(getHeroCoverSrc(index), "https://taozhiyy.top");
    assert.equal(source.origin, "https://taozhiyy.top");
    assert.ok(source.pathname.startsWith("/cos/"));
  }
  assert.doesNotMatch(heroSource, /cos\.ap-beijing\.myqcloud\.com/);
});

test("renders the taozhiyo wordmark inside the hero with the current wallpaper index", () => {
  assert.match(heroSource, /import HeroWordmark from "\.\/HeroWordmark"/);
  assert.match(heroSource, /<HeroWordmark heroIndex=\{currentIndex\} \/>/);
});

test("draws the taozhiyo wordmark from generated Pacifico glyph outlines", () => {
  assert.doesNotMatch(wordmarkSource, /<text\b/);
  assert.match(wordmarkSource, /PACIFICO_WORDMARK_PATHS/);
  assert.match(wordmarkSource, /generated from build\/src\/assets\/hello-font\.b64/);
  assert.match(wordmarkSource, /hero-wordmark-glyph/);
  assert.match(wordmarkSource, /hero-wordmark-stroke-path/);
  assert.match(wordmarkSource, /hero-wordmark-fill-after/);
  assert.match(wordmarkSource, /getTotalLength\(\)/);
  assert.match(wordmarkSource, /hero-wordmark--ready/);
  assert.doesNotMatch(wordmarkSource, /hero-wordmark-letter--/);
  assert.doesNotMatch(wordmarkSource, /hero-wordmark-cross/);
  assert.doesNotMatch(wordmarkSource, /hero-wordmark-dot/);
  assert.doesNotMatch(wordmarkSource, /hero-wordmark-swoosh/);
});

test("keeps the wordmark stroke outline thin enough to stay legible at hero size", () => {
  assert.match(cssSource, /\.hero-wordmark-stroke-path/);
  assert.match(cssSource, /stroke-width:\s*2/);
  assert.doesNotMatch(cssSource, /vector-effect:\s*non-scaling-stroke/);
});

test("keeps the taozhiyo wordmark out of the main phone hero content", () => {
  const mobileBlock = cssSource.match(
    /@media \(max-width:\s*767px\)\s*\{[\s\S]*?\.hero-wordmark\s*\{(?<rules>[\s\S]*?)\n\s*\}/
  );

  assert.ok(mobileBlock, "missing mobile hero wordmark rules");
  assert.match(mobileBlock.groups.rules, /top:\s*4\.85rem/);
  assert.match(mobileBlock.groups.rules, /left:\s*auto/);
  assert.match(mobileBlock.groups.rules, /right:\s*0\.75rem/);
  assert.match(mobileBlock.groups.rules, /width:\s*clamp\(7\.5rem,\s*38vw,\s*10\.5rem\)/);
  assert.match(mobileBlock.groups.rules, /z-index:\s*34/);
  assert.match(mobileBlock.groups.rules, /transform:\s*translate3d\(0,\s*0,\s*0\)/);
});

test("uses the build homepage draw and fill animation pattern", () => {
  assert.match(cssSource, /\.hero-wordmark\s*{[^}]*opacity:\s*1/s);
  assert.match(
    cssSource,
    /\.hero-wordmark--ready\s+\.hero-wordmark-stroke-path\s*{[^}]*animation:\s*heroWordmarkDraw/s
  );
  assert.match(cssSource, /@keyframes heroWordmarkDraw\s*{[^}]*stroke-dashoffset:\s*var\(--len\)/s);
  assert.match(cssSource, /@keyframes heroWordmarkFillIn\s*{/);
  assert.match(cssSource, /fill-opacity:\s*1/);
});

test("keeps the homepage visitor network, avatar, and cover switcher in one top-left row", () => {
  const navbarSource = readFileSync(new URL("./Navbar.jsx", import.meta.url), "utf8");

  assert.match(navbarSource, /import VisitorNetworkBadge from "\.\/VisitorNetworkBadge"/);
  assert.match(navbarSource, /className="nav-left-tools"/);
  assert.match(navbarSource, /<VisitorNetworkBadge\s+className="nav-left-network"/);
  assert.match(navbarSource, /aria-label="Home"/);
  assert.match(navbarSource, /SWITCH COVER/);
  assert.ok(
    navbarSource.indexOf('aria-label="Home"') <
      navbarSource.indexOf("SWITCH COVER"),
    "avatar should stay at the far left of the home toolbar"
  );
  assert.ok(
    navbarSource.indexOf("SWITCH COVER") <
      navbarSource.indexOf('<VisitorNetworkBadge className="nav-left-network"'),
    "visitor IP and latency should sit to the right of the cover switcher"
  );
  assert.match(cssSource, /\.nav-left-tools\s*\{[^}]*@apply flex[^}]*flex-wrap:\s*nowrap;/s);
  assert.match(cssSource, /\.visitor-network-badge\s*\{[^}]*display:\s*inline-flex;/s);
  assert.match(cssSource, /\.visitor-network-chip--address/);
  assert.match(cssSource, /\.visitor-network-chip--latency/);
});
