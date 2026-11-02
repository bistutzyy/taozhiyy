import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as themes from "./heroWordmarkTheme.js";

test("matches each text palette to its current wallpaper instead of an offset preview", () => {
  assert.deepEqual(
    Object.keys(themes.HERO_WORDMARK_THEMES).map(Number),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    [1, 2, 3, 4].map((index) => themes.getHeroWordmarkTheme(index).name),
    ["moon-blue", "coral-ink", "rain-blue", "star-rose"],
  );
  for (const index of [0, 99, -1, NaN, "__proto__", {}, null]) {
    assert.equal(
      themes.getHeroWordmarkTheme(index),
      themes.HERO_WORDMARK_THEMES[1],
    );
  }
});

test("keeps handwritten fills solid enough to remain distinct from busy photos", () => {
  for (const theme of Object.values(themes.HERO_WORDMARK_THEMES)) {
    for (const key of ["fill", "fillMid", "fillEnd"]) {
      const alpha = Number(theme[key].match(/,\s*([\d.]+)\)$/)?.[1]);
      assert.ok(alpha >= 0.94, `${theme.name} ${key} must not wash out`);
    }
    assert.equal(
      themes.getHeroWordmarkStyle(
        Object.keys(themes.HERO_WORDMARK_THEMES).find(
          (index) => themes.HERO_WORDMARK_THEMES[index] === theme,
        ),
      )["--hero-wordmark-fill"],
      theme.fill,
    );
  }
});

test("uses dark upper text on the bright second cover and light text on the other covers", () => {
  assert.equal(typeof themes.getHeroTextStyle, "function");
  const luminance = (hex) => {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map((value) => parseInt(value, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const index of [1, 2, 3, 4]) {
    const style = themes.getHeroTextStyle(index);
    assert.equal(luminance(style["--hero-title-ink"]) < 0.08, index === 2);
    assert.ok(
      luminance(style["--hero-signature-ink"]) > 0.85,
      "lower signatures stay light over darker image regions",
    );
    assert.equal(style["--hero-nav-ink"], style["--hero-title-ink"]);
    assert.ok(
      Object.keys(style).every(
        (key) => !/font|size|position|width|height|animation/.test(key),
      ),
    );
  }
});

test("applies colors only to hero copy and top-of-home navigation, restoring shared variables", () => {
  const hero = readFileSync(new URL("./Hero.jsx", import.meta.url), "utf8");
  const nav = readFileSync(new URL("./Navbar.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  assert.match(hero, /style=\{getHeroTextStyle\(currentIndex\)\}/);
  assert.match(hero, /data-home-cover=\{currentIndex\}/);
  assert.match(hero, /hero-welcome/);
  assert.match(hero, /hero-description/);
  assert.match(hero, /hero-signature/);
  assert.match(hero, /getPropertyPriority\(property\)/);
  assert.match(hero, /removeProperty\(property\)/);
  assert.match(
    nav,
    /pathname === "\/" && currentScrollY === 0 && "hero-nav-at-top"/,
  );
  assert.match(
    css,
    /\.hero-nav-at-top \.nav-hover-btn\s*\{[^}]*var\(--hero-nav-ink/,
  );
});
