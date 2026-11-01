const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = process.argv[2] || "http://127.0.0.1:5203";
const out = path.resolve(__dirname, "../.qa/bili-owner-videos");
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`), animations: "disabled" });

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const width of [320, 390, 430, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.route("**/api/**", route => route.fulfill({ json: {} }));
      await page.route("https://player.bilibili.com/**", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Player fixture</title>" }));
      await page.goto(`${base}/bili?v=owner-videos`, { waitUntil: "domcontentloaded" });
      const card = page.locator(".owner-video-card");
      await card.waitFor();
      await card.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const image = document.querySelector(".owner-video-card img");
        return image?.complete && image.naturalWidth > 0;
      });
      await card.locator("img").evaluate(image => image.decode());
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await card.count(), 1);
      assert.equal(await page.locator("iframe").count(), 0);
      assert.equal(await page.locator(".owner-videos__grid").getAttribute("data-layout"), "single");
      const box = await card.boundingBox();
      assert.ok(box.width <= 682 && box.x >= 0 && box.x + box.width <= width);
      assert.ok(Math.abs(box.x + box.width / 2 - width / 2) <= 1);
      if (width < 768) assert.equal(await page.locator(".bangumi-mini-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length), 2);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.evaluate(() => scrollTo(0, 0));
      await shot(page, `page-${width}`);

      const opener = page.locator(".owner-video-card__cover");
      await page.evaluate(() => document.body.style.setProperty("overflow", "auto", "important"));
      if (width === 320) { await opener.focus(); await page.keyboard.press("Enter"); }
      else await opener.click();
      const dialog = page.locator("dialog.bili-video-player[open]");
      await dialog.waitFor();
      const frame = dialog.locator("iframe");
      assert.equal(await frame.count(), 1);
      const src = new URL(await frame.getAttribute("src"));
      assert.equal(src.origin, "https://player.bilibili.com");
      assert.equal(src.searchParams.get("bvid"), "BV1jK7W6MEAj");
      assert.equal(src.searchParams.get("autoplay"), "0");
      const d = await dialog.boundingBox();
      assert.ok(d.x >= 0 && d.y >= 0 && d.x + d.width <= width + 1 && d.y + d.height <= 901);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "关闭视频");
      await shot(page, `player-${width}`);
      await page.keyboard.press("Escape");
      await page.locator(".bili-video-player").waitFor({ state: "detached" });
      assert.equal(await page.locator("iframe").count(), 0);
      assert.equal(await opener.evaluate(el => el === document.activeElement), true);
      assert.deepEqual(await page.evaluate(() => [document.body.style.getPropertyValue("overflow"), document.body.style.getPropertyPriority("overflow")]), ["auto", "important"]);
      await opener.click();
      await page.getByRole("button", { name: "关闭视频", exact: true }).click();
      assert.equal(await page.locator("iframe").count(), 0);
      if (width === 390) {
        const axes = () => ["overflow-x", "overflow-y"].map(property => [document.body.style.getPropertyValue(property), document.body.style.getPropertyPriority(property)]);
        await page.evaluate(() => {
          document.body.style.removeProperty("overflow");
          document.body.style.setProperty("overflow-x", "hidden", "important");
          document.body.style.setProperty("overflow-y", "auto");
        });
        const beforeAxes = await page.evaluate(axes);
        await opener.click();
        await page.keyboard.press("Escape");
        await page.locator(".bili-video-player").waitFor({ state: "detached" });
        assert.deepEqual(await page.evaluate(axes), beforeAxes, "axis-specific body overflow and priorities must be preserved");
      }
      if (width === 1440) {
        await opener.click();
        await page.mouse.click(3, 3);
        await page.locator(".bili-video-player").waitFor({ state: "detached" });
      }

      // Mount the real component with future list sizes, without adding preview switches to the app.
      for (const count of [2, 7]) {
        await page.evaluate(async count => {
          const { default: { createElement } } = await import("/node_modules/.vite/deps/react.js");
          const { default: { createRoot } } = await import("/node_modules/.vite/deps/react-dom_client.js");
          const { default: MyBiliVideos } = await import("/src/components/MyBiliVideos.jsx");
          const { ownerVideos } = await import("/src/data/biliOwnerVideos.js");
          document.getElementById("root").style.display = "none";
          if (!window.__ownerTestRoot) {
            const mount = document.createElement("div");
            mount.className = "bili-hub-page seasonal-page seasonal-page--autumn";
            document.body.append(mount);
            window.__ownerTestRoot = createRoot(mount);
          }
          window.__ownerTestRoot.render(createElement(MyBiliVideos, {
            videos: Array.from({ length: count }, (_, index) => ({ ...ownerVideos[0], bvid: `BV1jK7W6MEA${index}`, title: index === 1 ? "LongUnbrokenVideoTitle".repeat(5) : ownerVideos[0].title })),
          }));
        }, count);
        await page.waitForFunction(count => document.querySelectorAll("body > .bili-hub-page .owner-video-card").length === Math.min(count, 6), count);
        if (count > 6) {
          await page.getByRole("button", { name: "加载更多视频", exact: true }).click();
          assert.equal(await page.locator("body > .bili-hub-page .owner-video-card").count(), count);
        }
        const grid = page.locator("body > .bili-hub-page .owner-videos__grid");
        const columns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
        assert.equal(columns, count === 2 || width < 768 ? 2 : 3);
        const violations = await grid.evaluate(el => [...el.querySelectorAll("article, h3, a, time")].filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.className || node.tagName));
        assert.deepEqual(violations, []);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        await page.evaluate(() => scrollTo(0, 0));
        await shot(page, `future-${count}-${width}`);
      }
      if (width === 390) {
        await page.route("**/unavailable-owner-cover.jpg", route => route.abort());
        await page.evaluate(async () => {
          const { default: { createElement } } = await import("/node_modules/.vite/deps/react.js");
          const { default: MyBiliVideos } = await import("/src/components/MyBiliVideos.jsx");
          const { ownerVideos } = await import("/src/data/biliOwnerVideos.js");
          window.__ownerTestRoot.render(createElement(MyBiliVideos, { videos: [{ ...ownerVideos[0], cover: "/unavailable-owner-cover.jpg" }] }));
        });
        await page.locator("body > .bili-hub-page .owner-video-card__fallback").waitFor();
        assert.equal(await page.locator("body > .bili-hub-page .owner-video-card img").count(), 0);
        await page.locator("body > .bili-hub-page .owner-video-card__cover").click();
        await page.locator("dialog.bili-video-player[open]").waitFor();
        await page.getByRole("button", { name: "关闭视频", exact: true }).click();
      }
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${width}: real cover, single/future grids, player lifecycle, focus and existing bangumi layout`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
