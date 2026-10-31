const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const sharp = require("sharp");

const base = process.argv[2] || "http://127.0.0.1:5203";
const command = (page, name) => page.getByRole("button", { name, exact: true });

(async () => {
  const { getHeroCoverSrc } = await import("../main/src/components/heroCoverAssets.js");
  const fixture = await sharp({ create: { width: 640, height: 400, channels: 3, background: "#9d7989" } }).webp().toBuffer();
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const [width, sample, expected] of [[320, .01, 1], [390, .26, 2], [430, .51, 3], [1440, .76, 4]]) {
      const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, hasTouch: width < 768, isMobile: width < 768 });
      await context.addInitScript(({ sample }) => {
        Math.random = () => sample;
        localStorage.setItem("taozhiyy.home-cover.v1", "3");
        localStorage.setItem("taozhiyy.home-cover-brightness.v1", "85");
      }, { sample });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/**", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
      await page.route("**/hero-*.webp", route => route.fulfill({ contentType: "image/webp", body: fixture }));
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.getElementById("bg-image")?.naturalWidth > 0);
      assert.equal(await page.locator("#bg-image").getAttribute("src"), getHeroCoverSrc(expected));
      assert.equal(await page.locator("#bg-image").evaluate(el => getComputedStyle(el).filter), "brightness(0.85)");
      if (width < 768) {
        await command(page, "打开导航菜单").click();
        await page.locator(".nav-mobile-drawer.is-open").waitFor();
        assert.equal(await page.locator(".nav-mobile-drawer").getByRole("button", { name: "控制台" }).count(), 0);
        await command(page, "关闭菜单").click();
        await page.locator(".nav-mobile-root").waitFor({ state: "detached" });
      } else {
        assert.equal(await page.locator(".nav-console-trigger").isVisible(), true);
      }
      await command(page, "切换首页封面").click();
      await page.waitForFunction(() => [...document.querySelectorAll("[data-cover-index]")].length === 4 && [...document.querySelectorAll("[data-cover-index]")].every(el => !el.disabled));
      if (width < 768) {
        const geometry = await page.locator(".fan-leaf").evaluateAll(leaves => leaves.map(el => ({ rect: el.getBoundingClientRect().toJSON(), transform: getComputedStyle(el).transform })));
        assert.ok(Math.abs(geometry[0].rect.y - geometry[1].rect.y) < 1);
        assert.ok(geometry[2].rect.y > geometry[0].rect.y);
        for (const { rect, transform } of geometry) {
          assert.equal(transform, "none");
          assert.ok(Math.abs(rect.width - rect.height) < 1 && rect.width >= 44);
        }
        assert.equal(await page.locator(".fan-screen__arc").isVisible(), false);
        assert.equal(await page.locator(".fan-tassel").isVisible(), false);
        assert.equal(await page.locator("[data-cover-index='2']").evaluate(el => getComputedStyle(el).clipPath), "none");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        const photo = page.locator("[data-cover-index='2'] img");
        const samplePhoto = async () => {
          const buffer = await photo.screenshot();
          const { width, height } = await sharp(buffer).metadata();
          const pixel = await sharp(buffer).extract({ left: Math.floor(width / 2), top: Math.floor(height / 3), width: 1, height: 1 }).removeAlpha().raw().toBuffer();
          return (pixel[0] + pixel[1] + pixel[2]) / 3;
        };
        await page.getByRole("slider", { name: "亮度", exact: true }).focus();
        await page.keyboard.press("Home");
        const dim = await samplePhoto();
        await page.keyboard.press("End");
        const bright = await samplePhoto();
        assert.ok(bright > dim * 1.4, `mobile brightness must affect the visible photos: ${dim} -> ${bright}`);
        await command(page, "重置亮度").click();
        assert.equal(await photo.evaluate(el => getComputedStyle(el).filter), "brightness(1)");
        assert.equal(await page.evaluate(() => localStorage.getItem("taozhiyy.home-cover-brightness.v1")), "85", "draft brightness must not persist before Apply");
        await command(page, "关闭封面选择").click();
        assert.equal(await page.locator("#bg-image").evaluate(el => getComputedStyle(el).filter), "brightness(0.85)", "cancel must restore the original brightness");
        await command(page, "切换首页封面").click();
        await page.locator("dialog.cover-picker[open]").waitFor();
        await page.locator("[data-cover-index='2']").tap();
        await page.locator("dialog.cover-picker").waitFor({ state: "detached" });
        assert.equal(await page.locator(".cover-picker__reveal").count(), 0);
        assert.equal(await page.locator("#bg-image").getAttribute("src"), getHeroCoverSrc(2));
      } else {
        assert.equal(await page.locator(".fan-screen__arc").isVisible(), true);
        await command(page, "关闭封面选择").click();
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.getElementById("bg-image")?.naturalWidth > 0);
      assert.equal(await page.locator("#bg-image").getAttribute("src"), getHeroCoverSrc(expected));
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: random initial cover ${expected}, remembered brightness, responsive navigation and cover controls`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
