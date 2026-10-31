import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getHeroCoverSrc } from "./heroCoverAssets.js";

test("cover 2 and 3 use the approved versioned COS images in attachment order", () => {
  assert.ok(getHeroCoverSrc(2).endsWith("/img/hero-2-20261031.webp"));
  assert.ok(getHeroCoverSrc(3).endsWith("/img/hero-3-20261031.webp"));
});

test("cover 1 and 4 keep their existing files and all images use the same-origin COS proxy", () => {
  assert.ok(getHeroCoverSrc(1).endsWith("/img/hero-1.webp"));
  assert.ok(getHeroCoverSrc(4).endsWith("/img/hero-4.webp"));
  const sources = [1, 2, 3, 4].map(getHeroCoverSrc);
  assert.equal(new Set(sources).size, 4);
  for (const source of sources) {
    assert.ok(source.startsWith("/cos/"));
    assert.ok(source.includes("/main/img/"));
    assert.doesNotMatch(source, /myqcloud\.com|\.png$/);
  }
});

test("Hero builds both its active cover and fan options from the shared cover URLs", () => {
  const hero = readFileSync(new URL("./Hero.jsx", import.meta.url), "utf8");
  assert.match(hero, /getHeroCoverSrc as getImgSrc/);
  assert.match(hero, /src: getImgSrc\(index\)/);
  assert.match(hero, /src=\{getImgSrc\(currentIndex\)\}/);
});
