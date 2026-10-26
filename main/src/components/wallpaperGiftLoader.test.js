import test from "node:test";
import assert from "node:assert/strict";

import { loadWallpaperGift, pickWallpaperPosterImage } from "./wallpaperGiftLoader.js";

test("prefers the lightweight preview image for the lottery poster", () => {
  assert.equal(
    pickWallpaperPosterImage({
      url: "https://i.pixiv.re/img-master/img/full.jpg",
      previewUrl: "https://i.pixiv.re/c/540x540_70/img-master/img/small.jpg",
    }),
    "https://i.pixiv.re/c/540x540_70/img-master/img/small.jpg"
  );
});

test("falls back to the full image when no preview is available", () => {
  assert.equal(
    pickWallpaperPosterImage({ url: "https://example.test/full.jpg" }),
    "https://example.test/full.jpg"
  );
});

test("returns an empty poster for a missing wallpaper", () => {
  assert.equal(pickWallpaperPosterImage(null), "");
  assert.equal(pickWallpaperPosterImage({}), "");
});

test("falls back when the wallpaper request does not settle before the timeout", async () => {
  const fallback = { url: "https://example.test/fallback.jpg" };

  const result = await loadWallpaperGift({
    requestWallpaper: () => new Promise(() => {}),
    pickFallback: () => fallback,
    timeoutMs: 5,
  });

  assert.equal(result, fallback);
});

test("returns an unavailable gift instead of a local fallback in api-only mode", async () => {
  const result = await loadWallpaperGift({
    apiOnly: true,
    requestWallpaper: () => new Promise(() => {}),
    pickFallback: () => ({ url: "https://example.test/fallback.jpg" }),
    timeoutMs: 5,
  });

  assert.equal(result.url, "");
  assert.equal(result.sourceUrl, "https://taozhiyy.top/api/v1/wallpapers/draw?source=api");
});

