import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("owner video cards render real content and never preload an iframe", async () => {
  const { createServer } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;
  const server = await createServer({
    configFile: false,
    cacheDir: fileURLToPath(
      new URL("../../node_modules/.cache/bili-owner-ssr", import.meta.url),
    ),
    plugins: [react()],
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const { default: MyBiliVideos } = await server.ssrLoadModule(
      "/src/components/MyBiliVideos.jsx",
    );
    const { ownerVideos } = await server.ssrLoadModule(
      "/src/data/biliOwnerVideos.js",
    );
    const initial = renderToStaticMarkup(createElement(MyBiliVideos));
    assert.match(initial, /我的视频/);
    assert.match(initial, /data-layout="single"/);
    assert.match(initial, /data-video-bvid="BV1jK7W6MEAj"/);
    assert.match(initial, /loading="lazy"/);
    assert.match(initial, /VibeCoding/);
    assert.doesNotMatch(initial, /<iframe/);
    for (const [count, layout] of [
      [0, "empty"],
      [2, "pair"],
      [7, "collection"],
    ]) {
      const videos = Array.from({ length: count }, (_, index) => ({
        ...ownerVideos[0],
        bvid: `BV1jK7W6MEA${index}`,
      }));
      const html = renderToStaticMarkup(
        createElement(MyBiliVideos, { videos }),
      );
      assert.match(html, new RegExp(`data-layout="${layout}"`));
      assert.equal((html.match(/data-video-bvid=/g) || []).length, count);
      assert.doesNotMatch(html, /<iframe/);
    }
    const unsafe = renderToStaticMarkup(
      createElement(MyBiliVideos, {
        videos: [{ ...ownerVideos[0], bvid: "javascript:alert(1)" }],
      }),
    );
    assert.doesNotMatch(unsafe, /data-video-bvid=|javascript:/);
  } finally {
    await server.close();
  }
});
