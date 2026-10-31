import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const stateURL = new URL("./coverState.js", import.meta.url);
const getState = async () => {
  assert.ok(existsSync(stateURL), "cover state module must exist");
  return import(stateURL.href);
};

test("cover storage accepts only canonical indices for the four existing images", async () => {
  const { COVER_INDEXES, resolveCoverIndex } = await getState();
  assert.deepEqual(COVER_INDEXES, [1, 2, 3, 4]);
  for (const value of [
    null,
    undefined,
    "",
    "0",
    "5",
    "1.5",
    "02",
    "__proto__",
    NaN,
  ]) {
    assert.equal(resolveCoverIndex(value), 1);
  }
  assert.equal(resolveCoverIndex("3"), 3);
  assert.equal(resolveCoverIndex(4), 4);
});

test("cover selection persists safely without requiring browser storage", async () => {
  const { COVER_STORAGE_KEY, readCoverPreference, writeCoverPreference } =
    await getState();
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  };
  writeCoverPreference(storage, 3);
  assert.equal(data.get(COVER_STORAGE_KEY), "3");
  assert.equal(readCoverPreference(storage), 3);
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(readCoverPreference(blocked), 1);
  assert.doesNotThrow(() => writeCoverPreference(blocked, 4));
});

test("Hero uses a shared filmstrip on desktop and mobile without compass or poetry", () => {
  const hero = readFileSync(new URL("../Hero.jsx", import.meta.url), "utf8");
  assert.match(hero, /<CoverPicker/);
  assert.doesNotMatch(hero, /HERO_POEM|pointedPoem|Compass|compass|转动指南针/);
  assert.match(hero, /readCoverPreference/);
  assert.match(hero, /writeCoverPreference/);
  assert.match(hero, /\.decode\(/);
  assert.match(hero, /prefers-reduced-motion/);
  assert.match(hero, /fetchpriority:\s*"high"/);
  assert.match(hero, /\{\.\.\.heroImagePriority\}/);
  assert.doesNotMatch(hero, /fetchPriority=/);
  const nav = readFileSync(new URL("../Navbar.jsx", import.meta.url), "utf8");
  assert.match(nav, /aria-label="切换首页封面"/);
  assert.match(nav, /className="nav-cover-trigger"/);
});
