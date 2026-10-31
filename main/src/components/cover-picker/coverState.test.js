import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const stateURL = new URL("./coverState.js", import.meta.url);
const getState = async () => {
  assert.ok(existsSync(stateURL), "cover state module must exist");
  return import(stateURL.href);
};

test("quadrant highlighting follows the latest pointer or focus trigger and restores the remaining trigger", async () => {
  const { updateCoverPreviewTrigger, getHighlightedCoverIndex } =
    await getState();
  assert.equal(typeof updateCoverPreviewTrigger, "function");
  assert.equal(typeof getHighlightedCoverIndex, "function");
  const ready = [1, 2, 3, 4];
  let state = [];
  assert.equal(getHighlightedCoverIndex(state, ready), null);
  state = updateCoverPreviewTrigger(state, "focus", 1);
  state = updateCoverPreviewTrigger(state, "pointer", 2);
  assert.equal(getHighlightedCoverIndex(state, ready), 2);
  state = updateCoverPreviewTrigger(state, "pointer", 2, false);
  assert.equal(getHighlightedCoverIndex(state, ready), 1);
  state = updateCoverPreviewTrigger(state, "focus", 1, false);
  assert.equal(getHighlightedCoverIndex(state, ready), null);
});

test("stale leave events, loading images and invalid inputs never highlight the wrong quadrant", async () => {
  const { updateCoverPreviewTrigger, getHighlightedCoverIndex } =
    await getState();
  assert.equal(typeof updateCoverPreviewTrigger, "function");
  let state = updateCoverPreviewTrigger([], "pointer", 1);
  const before = state;
  state = updateCoverPreviewTrigger(state, "pointer", 3);
  assert.deepEqual(before, [{ source: "pointer", index: 1 }]);
  state = updateCoverPreviewTrigger(state, "pointer", 1, false);
  assert.equal(getHighlightedCoverIndex(state, [1, 2, 3]), 3);
  assert.equal(getHighlightedCoverIndex(state, [1, 2]), null);
  assert.deepEqual(updateCoverPreviewTrigger(state, "unknown", 1), state);
  assert.deepEqual(updateCoverPreviewTrigger(state, "focus", 9), state);
  state = updateCoverPreviewTrigger(state, "command", 2);
  assert.equal(getHighlightedCoverIndex(state, [1, 2, 3]), 2);
  state = updateCoverPreviewTrigger(state, "focus", 4);
  assert.equal(getHighlightedCoverIndex(state, [1, 2, 3]), 2);
  assert.equal(state.length, 3);
});

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

test("brightness accepts only integers and canonical integer strings from 70 to 115", async () => {
  const { resolveCoverBrightness } = await getState();
  assert.equal(typeof resolveCoverBrightness, "function");
  for (let value = 70; value <= 115; value += 1) {
    assert.equal(resolveCoverBrightness(value), value);
    assert.equal(resolveCoverBrightness(String(value)), value);
  }
  for (const value of [
    null,
    undefined,
    "",
    "069",
    "085",
    " 85",
    "85 ",
    "85\n",
    "85\r",
    "85\r\n",
    "85\u2028",
    "+85",
    "85.0",
    "8.5e1",
    "0x55",
    "__proto__",
    "69",
    "116",
    69,
    116,
    85.5,
    NaN,
    Infinity,
    -Infinity,
    true,
    [],
    {},
  ]) {
    assert.equal(resolveCoverBrightness(value), 100);
  }
});

test("brightness persists validated values under its own versioned key", async () => {
  const {
    COVER_STORAGE_KEY,
    COVER_BRIGHTNESS_KEY,
    readCoverBrightness,
    writeCoverBrightness,
  } = await getState();
  assert.equal(COVER_BRIGHTNESS_KEY, "taozhiyy.home-cover-brightness.v1");
  const data = new Map([[COVER_STORAGE_KEY, "3"]]);
  const storage = {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  };
  assert.equal(readCoverBrightness(storage), 100);
  writeCoverBrightness(storage, "85");
  assert.equal(data.get(COVER_BRIGHTNESS_KEY), "85");
  assert.equal(readCoverBrightness(storage), 85);
  assert.equal(data.get(COVER_STORAGE_KEY), "3");
  data.set(COVER_BRIGHTNESS_KEY, "085");
  assert.equal(readCoverBrightness(storage), 100);
  writeCoverBrightness(storage, 116);
  assert.equal(data.get(COVER_BRIGHTNESS_KEY), "100");
});

test("brightness falls back safely with missing or blocked storage", async () => {
  const { readCoverBrightness, writeCoverBrightness } = await getState();
  assert.equal(typeof readCoverBrightness, "function");
  assert.equal(typeof writeCoverBrightness, "function");
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  for (const storage of [undefined, null, {}, blocked]) {
    assert.equal(readCoverBrightness(storage), 100);
    assert.doesNotThrow(() => writeCoverBrightness(storage, 85));
  }
});

test("shuffle selects only unique valid available covers other than the current one", async () => {
  const { getRandomCoverIndex } = await getState();
  assert.equal(typeof getRandomCoverIndex, "function");
  const available = [0, 1, 2, 2, "2", 3, 4, 5, null, NaN, 1.5];
  assert.equal(getRandomCoverIndex(available, 1, 0), 2);
  assert.equal(getRandomCoverIndex(available, 1, 0.32), 2);
  assert.equal(getRandomCoverIndex(available, 1, 1 / 3), 3);
  assert.equal(getRandomCoverIndex(available, 1, 2 / 3), 4);
  assert.equal(getRandomCoverIndex(new Set([1, 4]), 1), 4);
  assert.deepEqual(available, [0, 1, 2, 2, "2", 3, 4, 5, null, NaN, 1.5]);
});

test("shuffle clamps random samples and defaults invalid samples to zero", async () => {
  const { getRandomCoverIndex } = await getState();
  assert.equal(typeof getRandomCoverIndex, "function");
  assert.equal(getRandomCoverIndex([1, 2, 3, 4], 1, -1), 2);
  assert.equal(getRandomCoverIndex([1, 2, 3, 4], 1, 1), 4);
  assert.equal(getRandomCoverIndex([1, 2, 3, 4], 1, 2), 4);
  for (const random of [NaN, Infinity, -Infinity, null, "0.9", {}, () => 0.9]) {
    assert.equal(getRandomCoverIndex([1, 2, 3, 4], 1, random), 2);
  }
});

test("shuffle returns null when there is no valid alternate cover", async () => {
  const { getRandomCoverIndex } = await getState();
  assert.equal(typeof getRandomCoverIndex, "function");
  for (const available of [
    undefined,
    null,
    [],
    [1, 1],
    [0, 5, "2"],
    new Set([1]),
  ]) {
    assert.equal(getRandomCoverIndex(available, 1, 0.5), null);
  }
});

test("Hero restores brightness and passes the applied value into the cover picker", () => {
  const hero = readFileSync(new URL("../Hero.jsx", import.meta.url), "utf8");
  assert.match(
    hero,
    /\[currentBrightness, setCurrentBrightness\]\s*=\s*useState\(/,
  );
  assert.match(hero, /readCoverBrightness\(window\.localStorage\)/);
  assert.match(
    hero,
    /readCoverBrightness\(window\.localStorage\);\s*\}\s*catch\s*\{\s*return 100;/,
  );
  assert.match(
    hero,
    /<CoverPicker\b[^>]*currentBrightness=\{currentBrightness\}/s,
  );
});

test("Hero validates and applies brightness before the same-cover early return", () => {
  const hero = readFileSync(new URL("../Hero.jsx", import.meta.url), "utf8");
  const apply = hero.match(
    /const applyCover = \(\s*index,\s*brightness = currentBrightness,[\s\S]*?\) => \{([\s\S]*?)\n {2}\};/,
  );
  assert.ok(
    apply,
    "applyCover must accept brightness with the applied value as its default",
  );
  const body = apply[1];
  assert.match(body, /setHasClicked\(!skipTransition\)/);
  assert.match(body, /setIsTransitioning\(!skipTransition\)/);
  const readyGuard = body.indexOf(
    "if (!isHeroImageReady(index, loadedHeroIndexes)) return;",
  );
  const validate = body.indexOf("resolveCoverBrightness(brightness)");
  const persistCover = body.indexOf(
    "writeCoverPreference(window.localStorage, index)",
  );
  const persistBrightness = body.indexOf(
    "writeCoverBrightness(window.localStorage,",
  );
  const setBrightness = body.indexOf("setCurrentBrightness(");
  const close = body.indexOf("setSelectorOpen(false)");
  const sameCover = body.indexOf("if (index === currentIndex) return;");
  assert.ok(readyGuard >= 0 && validate > readyGuard);
  for (const position of [
    persistCover,
    persistBrightness,
    setBrightness,
    close,
  ]) {
    assert.ok(position > validate && position < sameCover);
  }
});

test("Hero applies brightness to both image layers without filtering its text or clearing the filter", () => {
  const hero = readFileSync(new URL("../Hero.jsx", import.meta.url), "utf8");
  const imageTags = hero.match(/<img\b[\s\S]*?\/>/g) ?? [];
  for (const id of ["bg-image", "previous-image"]) {
    const image = imageTags.find((tag) => tag.includes(`id="${id}"`));
    assert.ok(image, `${id} must remain an image`);
    assert.match(
      image,
      /style=\{\{\s*filter:\s*`brightness\(\$\{currentBrightness \/ 100\}\)`\s*,?\s*\}\}/,
    );
  }
  assert.equal((hero.match(/filter:/g) ?? []).length, 2);
  assert.doesNotMatch(hero, /clearProps:\s*["'][^"']*filter/);
});

test("Hero uses a shared cover picker on desktop and mobile without compass or poetry", () => {
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
