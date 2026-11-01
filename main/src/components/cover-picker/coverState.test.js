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

test("a fresh session starts at cover one without mutating storage during initialization", async () => {
  const { getInitialCoverIndex, markHomeCoverVisited, HOME_COVER_VISIT_KEY } =
    await getState();
  assert.equal(typeof getInitialCoverIndex, "function");
  assert.equal(typeof markHomeCoverVisited, "function");
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  };
  assert.equal(getInitialCoverIndex(storage, 0.99), 1);
  assert.equal(
    getInitialCoverIndex(storage, 0.99),
    1,
    "StrictMode reads must not consume the first visit",
  );
  assert.equal(data.size, 0);
  markHomeCoverVisited(storage);
  assert.equal(data.get(HOME_COVER_VISIT_KEY), "1");
  assert.equal(
    getInitialCoverIndex(storage, 0.99, "navigate"),
    1,
    "a new tab with copied storage still starts at cover one",
  );
  assert.equal(getInitialCoverIndex(storage, 0.99, "back_forward"), 1);
  assert.deepEqual(
    [0, 0.25, 0.5, 0.75].map((sample) =>
      getInitialCoverIndex(storage, sample, "reload"),
    ),
    [1, 2, 3, 4],
  );
  data.set(HOME_COVER_VISIT_KEY, "invalid");
  assert.equal(getInitialCoverIndex(storage, 0.99), 1);
});

test("session cover selection falls back safely with missing or blocked storage", async () => {
  const { getInitialCoverIndex, markHomeCoverVisited } = await getState();
  assert.equal(typeof getInitialCoverIndex, "function");
  assert.equal(typeof markHomeCoverVisited, "function");
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  for (const storage of [undefined, null, {}, blocked]) {
    assert.equal(getInitialCoverIndex(storage, 0.99), 1);
    assert.doesNotThrow(() => markHomeCoverVisited(storage));
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

test("Hero ignores legacy brightness and mounts its images at their original brightness", () => {
  const hero = readFileSync(new URL("../Hero.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(
    hero,
    /currentBrightness|readCoverBrightness|writeCoverBrightness|brightness\(/,
  );
});

test("Hero applies a ready cover and closes the picker before the same-cover early return", () => {
  const hero = readFileSync(new URL("../Hero.jsx", import.meta.url), "utf8");
  const apply = hero.match(
    /const applyCover = \(\s*index,\s*\{ skipTransition = false \} = \{\},?\s*\) => \{([\s\S]*?)\n {2}\};/,
  );
  assert.ok(
    apply,
    "applyCover must accept only the cover and transition options",
  );
  const body = apply[1];
  assert.match(body, /setHasClicked\(!skipTransition\)/);
  assert.match(body, /setIsTransitioning\(!skipTransition\)/);
  const readyGuard = body.indexOf(
    "if (!isHeroImageReady(index, loadedHeroIndexes)) return;",
  );
  const persistCover = body.indexOf(
    "writeCoverPreference(window.localStorage, index)",
  );
  const close = body.indexOf("setSelectorOpen(false)");
  const sameCover = body.indexOf("if (index === currentIndex) return;");
  assert.ok(readyGuard >= 0);
  for (const position of [persistCover, close]) {
    assert.ok(position > readyGuard && position < sameCover);
  }
});

test("Hero keeps both image layers without a hidden brightness filter", () => {
  const hero = readFileSync(new URL("../Hero.jsx", import.meta.url), "utf8");
  const imageTags = hero.match(/<img\b[\s\S]*?\/>/g) ?? [];
  for (const id of ["bg-image", "previous-image"]) {
    const image = imageTags.find((tag) => tag.includes(`id="${id}"`));
    assert.ok(image, `${id} must remain an image`);
    assert.doesNotMatch(image, /filter:/);
  }
});

test("Hero reads the first-visit rule and marks a visit after mounting", () => {
  const hero = readFileSync(new URL("../Hero.jsx", import.meta.url), "utf8");
  assert.match(hero, /getInitialCoverIndex\(\s*window\.sessionStorage,/);
  assert.match(hero, /getEntriesByType\("navigation"\)/);
  assert.match(
    hero,
    /useEffect\(\(\) => \{\s*try \{\s*markHomeCoverVisited\(window\.sessionStorage\)/,
  );
  assert.doesNotMatch(hero, /readCoverPreference/);
});

test("Hero uses a shared cover picker on desktop and mobile without compass or poetry", () => {
  const hero = readFileSync(new URL("../Hero.jsx", import.meta.url), "utf8");
  assert.match(hero, /<CoverPicker/);
  assert.doesNotMatch(hero, /HERO_POEM|pointedPoem|Compass|compass|转动指南针/);
  assert.match(hero, /getInitialCoverIndex/);
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
