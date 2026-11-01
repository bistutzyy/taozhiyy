const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.argv[2] || "http://127.0.0.1:5203";
const owner = { uid: "1061280173", name: "Synced Owner", profileUrl: "https://space.bilibili.com/1061280173/" };
const items = Array.from({ length: 7 }, (_, index) => ({
  bvid: `BV1jK7W6MEA${index}`, title: `Synced upload ${index}`, description: "Cached public video",
  cover: "https://i0.hdslb.com/bfs/archive/8801efe18261b994c85f1d3cbccba3eeede34189.jpg",
  publishedAt: "2026-06-27T16:04:10Z", duration: "04:36",
}));
const feed = (extra = {}) => ({ owner, items, ready: true, syncedAt: "2026-11-01T00:00:00Z", ...extra });

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(6000);
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      let currentFeed = feed();
      let status = 200;
      let calls = 0;
      let pause = null;
      await page.route("**/api/**", route => {
        if (new URL(route.request().url()).pathname === "/api/v1/acg/image/updated_cover.jpg") {
          return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
        }
        if (new URL(route.request().url()).pathname === "/api/v1/bili/videos") {
          calls += 1;
          if (pause) return pause.then(() => route.fulfill({ status, json: currentFeed }));
          return route.fulfill({ status, json: currentFeed });
        }
        return route.fulfill({ json: {} });
      });
      await page.route("https://player.bilibili.com/**", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Player fixture</title>" }));
      await page.goto(`${base}/bili`, { waitUntil: "domcontentloaded" });
      await page.locator('[data-video-bvid="BV1jK7W6MEA0"]').waitFor();
      assert.equal(await page.locator(".owner-video-card").count(), 6);
      assert.equal(await page.locator(".owner-videos__profile").innerText(), "Synced Owner");
      assert.match(await page.locator("#owner-videos-title").innerText(), /7/);
      const beforeMore = calls;
      await page.getByRole("button", { name: "加载更多视频", exact: true }).click();
      assert.equal(await page.locator(".owner-video-card").count(), 7);
      assert.equal(calls, beforeMore, "load-more must use the cached list without fetching upstream");
      assert.equal(await page.locator("iframe").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);

      currentFeed = feed({ items: [] });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByText("还没有公开的视频", { exact: true }).waitFor();
      assert.equal(await page.locator(".owner-video-card").count(), 0);

      currentFeed = feed({ ready: false, syncedAt: "", items: [] });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByText("等待首次同步", { exact: true }).waitFor();
      assert.equal(await page.locator(".owner-video-card").count(), 1);

      status = 503;
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByText("暂用已收录视频", { exact: true }).waitFor();
      assert.equal(await page.locator(".owner-video-card").count(), 1);
      assert.equal(await page.locator(".owner-videos__profile").getAttribute("href"), owner.profileUrl);

      status = 200;
      currentFeed = feed({ owner: { uid: "999", name: "Wrong account" } });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByText("暂用已收录视频", { exact: true }).waitFor();
      assert.equal(await page.getByText("Wrong account", { exact: true }).count(), 0);
      if (width === 390) {
        let release;
        pause = new Promise(resolve => { release = resolve; });
        currentFeed = feed({ items: [] });
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.locator(".owner-video-card__cover").click();
        await page.locator("dialog.bili-video-player[open]").waitFor();
        release();
        await page.getByText("还没有公开的视频", { exact: true }).waitFor();
        await page.locator("dialog.bili-video-player").waitFor({ state: "detached" });
        assert.equal(await page.locator("iframe").count(), 0);
        assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden");
        pause = new Promise(resolve => { release = resolve; });
        currentFeed = feed({ items: [{ ...items[0], bvid: "BV1jK7W6MEAj", title: "Recovered cover", cover: "/api/v1/acg/image/updated_cover.jpg" }] });
        await page.route("https://i0.hdslb.com/bfs/archive/8801efe18261b994c85f1d3cbccba3eeede34189.jpg", route => route.abort());
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.locator(".owner-video-card__fallback").waitFor();
        release();
        await page.getByText("Recovered cover", { exact: true }).waitFor();
        await page.waitForFunction(() => {
          const image = document.querySelector(".owner-video-card img");
          return image?.complete && image.naturalWidth > 0 && image.getAttribute("src").endsWith("updated_cover.jpg");
        }, null, { timeout: 6000 });
      }
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS ${width}: cached API, seven uploads, local load-more, successful empty, pending and failure/wrong-owner fallback`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
