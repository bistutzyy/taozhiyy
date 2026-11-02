const assert = require("node:assert/strict");
const { mkdirSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { chromium } = require("playwright");

const base = process.argv[2] || "http://127.0.0.1:5205";
const output = process.argv[3] || join(tmpdir(), "about-opencheck-qa");

(async () => {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
        isMobile: width < 768,
        hasTouch: width < 768,
      });
      // Keep all backend traffic local to this browser test, including status polling.
      await context.route("**/*", (route) => {
        const request = route.request();
        if (!['GET', 'HEAD'].includes(request.method()) || new URL(request.url()).pathname.startsWith("/api/")) {
          return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
        }
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}/about`, { waitUntil: "domcontentloaded" });
      const card = page.locator(".p-opencheck");
      await card.waitFor();
      assert.equal(await page.locator(".projects .project").count(), 4);
      assert.equal(await page.locator(".p-quizcard").getAttribute("href"), "/showcase/quizcard.html");
      assert.equal(await page.locator(".about-route-page").evaluate((el) => el.classList.contains("seasonal-page--spring")), true);
      await card.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector(".about-route-shadow")?.shadowRoot?.querySelector(".p-opencheck img")?.naturalWidth > 0);
      const coverFilter = await card.locator("img").evaluate((el) => getComputedStyle(el).filter);
      assert.equal(coverFilter, "none", "the repository screenshot must remain inspectable");
      const cardBounds = await card.boundingBox();
      assert.ok(cardBounds.x >= 0 && cardBounds.x + cardBounds.width <= width + 1);
      await page.locator(".projects").screenshot({ path: join(output, `about-gallery-${width}.png`) });
      await card.click();
      await page.waitForURL("**/showcase/opencheck.html");
      assert.equal(await page.locator("h1").innerText(), "OpenCheck");
      await page.locator(".screenshots").scrollIntoViewIfNeeded();
      for (const image of await page.locator("main img").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((el) => el.decode());
      }
      const imageSource = await page.locator(".overview-shot img").evaluate((el) => el.currentSrc);
      assert.ok(imageSource.endsWith(width < 600 ? "opencheck-mobile-home.png" : "opencheck-home.png"));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const overflowing = await page.locator("main a, main p, main h1, main h2, main figcaption").evaluateAll((elements) =>
        elements.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
      );
      assert.deepEqual(overflowing, []);
      for (const link of await page.locator('a[target="_blank"]').all()) {
        assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
      }
      await page.screenshot({ path: join(output, `opencheck-full-${width}.png`), fullPage: true });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: join(output, `opencheck-top-${width}.png`) });
      await page.getByRole("link", { name: "返回关于页" }).click();
      await page.waitForURL("**/about");
      await page.locator(".p-opencheck").waitFor();
      await page.goto(`${base}/about/projects/opencheck`, { waitUntil: "domcontentloaded" });
      await page.waitForURL("**/showcase/opencheck.html");
      await page.goto(`${base}/about/projects/not-a-project`, { waitUntil: "domcontentloaded" });
      await page.waitForURL("**/about");
      await page.locator(".p-opencheck").waitFor();
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: spring About gallery, card navigation, source screenshots, responsive layout, route aliases, safe external links`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`Screenshots: ${output}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
