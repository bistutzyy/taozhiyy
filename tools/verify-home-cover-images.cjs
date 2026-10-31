const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const base = (process.argv[2] || "http://127.0.0.1:5200").replace(/\/$/, "");
const out = path.resolve(__dirname, "../previews/project-gallery/.qa/cover-images");
const key = "taozhiyy.home-cover.v1";

(async () => {
  const { getHeroCoverSrc } = await import("../main/src/components/heroCoverAssets.js");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript((key) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, "2");
    }, key);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => {
      // Shared assistant scripts are installed separately by the production deploy.
      if (new URL(base).hostname !== "127.0.0.1" || !error.message.includes("Unexpected token '<'"))
        errors.push(error.message);
    });
    await page.route("**/api/**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      for (const index of [2, 3]) {
        await page.getByRole("button", { name: "切换首页封面", exact: true }).click();
        const leaf = page.locator(`dialog.cover-picker [data-cover-index="${index}"]`);
        await page.waitForFunction((index) => {
          const button = document.querySelector(`dialog.cover-picker [data-cover-index="${index}"]`);
          return button && !button.disabled;
        }, index, { timeout: 65000 });
        await leaf.focus();
        await page.waitForFunction((index) => document.querySelector("dialog.cover-picker [data-preview-index]")?.dataset.previewIndex === String(index), index);
        assert.equal(await leaf.locator("img").getAttribute("src"), getHeroCoverSrc(index));
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(out, `fan-${index}-${width}.png`) });
        await leaf.locator("[data-fan-hit]").click();
        await page.locator("dialog.cover-picker").waitFor({ state: "detached" });
        await page.waitForFunction(() => document.getElementById("bg-image")?.naturalWidth > 0);
        assert.equal(await page.locator("#bg-image").getAttribute("src"), getHeroCoverSrc(index));
        const size = await page.locator("#bg-image").evaluate((img) => [img.naturalWidth, img.naturalHeight]);
        assert.deepEqual(size, index === 2 ? [3840, 2715] : [3840, 2072]);
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), key), String(index));
        assert.equal(await page.locator("#bg-image").evaluate((img) => Number(getComputedStyle(img).opacity)), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        await page.screenshot({ path: path.join(out, `home-${index}-${width}.png`) });
        console.log(`PASS ${width}: cover ${index}, versioned COS image, fan preview, apply and saved preference`);
      }
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.getElementById("bg-image")?.naturalWidth > 0);
    assert.equal(await page.locator("#bg-image").getAttribute("src"), getHeroCoverSrc(3));
    assert.deepEqual(errors, []);
    await context.close();
    console.log("PASS reload restores the new cover 3 without page errors");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
