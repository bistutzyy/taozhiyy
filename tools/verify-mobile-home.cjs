const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const sharp = require("sharp");

const base = process.argv[2] || "http://127.0.0.1:5203";
const command = (page, name) => page.getByRole("button", { name, exact: true });

(async () => {
  const { getHeroCoverSrc } =
    await import("../main/src/components/heroCoverAssets.js");
  const fixture = await sharp({
    create: { width: 640, height: 400, channels: 3, background: "#9d7989" },
  })
    .webp()
    .toBuffer();
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const [width, sample, expected] of [
      [320, 0.01, 1],
      [390, 0.26, 2],
      [430, 0.51, 3],
      [1440, 0.76, 4],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 1440 ? 900 : 844 },
        hasTouch: width < 768,
        isMobile: width < 768,
      });
      await context.addInitScript(
        ({ sample }) => {
          Math.random = () => sample;
          localStorage.setItem("taozhiyy.home-cover.v1", "3");
          localStorage.setItem("taozhiyy.home-cover-brightness.v1", "85");
        },
        { sample },
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/**", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: "{}",
        }),
      );
      await page.route("**/hero-*.webp", (route) =>
        route.fulfill({ contentType: "image/webp", body: fixture }),
      );
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => document.getElementById("bg-image")?.naturalWidth > 0,
      );
      assert.equal(
        await page.locator("#bg-image").getAttribute("src"),
        getHeroCoverSrc(1),
        "a fresh session always starts on cover one",
      );
      assert.equal(
        await page
          .locator("#bg-image")
          .evaluate((el) => getComputedStyle(el).filter),
        "none",
        "legacy brightness must not dim the wallpaper",
      );
      assert.equal(
        await page.evaluate(() =>
          sessionStorage.getItem("taozhiyy.home-cover-visited.v1"),
        ),
        "1",
      );
      if (width < 768) {
        await command(page, "打开导航菜单").click();
        await page.locator(".nav-mobile-drawer.is-open").waitFor();
        assert.equal(
          await page
            .locator(".nav-mobile-drawer")
            .getByRole("button", { name: "控制台" })
            .count(),
          0,
        );
        await command(page, "关闭菜单").click();
        await page.locator(".nav-mobile-root").waitFor({ state: "detached" });
      } else {
        assert.equal(
          await page.locator(".nav-console-trigger").isVisible(),
          true,
        );
      }
      await command(page, "切换首页封面").click();
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("[data-cover-index]")].length === 4 &&
          [...document.querySelectorAll("[data-cover-index]")].every(
            (el) => !el.disabled,
          ),
      );
      assert.equal(await page.getByRole("slider").count(), 0);
      assert.equal(await page.locator(".fan-brightness").count(), 0);
      if (width < 768) {
        const geometry = await page
          .locator(".fan-leaf")
          .evaluateAll((leaves) =>
            leaves.map((el) => ({
              rect: el.getBoundingClientRect().toJSON(),
              transform: getComputedStyle(el).transform,
            })),
          );
        assert.ok(Math.abs(geometry[0].rect.y - geometry[1].rect.y) < 1);
        assert.ok(geometry[2].rect.y > geometry[0].rect.y);
        for (const { rect, transform } of geometry) {
          assert.equal(transform, "none");
          assert.ok(Math.abs(rect.width - rect.height) < 1 && rect.width >= 44);
        }
        assert.equal(await page.locator(".fan-screen__arc").isVisible(), false);
        assert.equal(await page.locator(".fan-tassel").isVisible(), false);
        assert.equal(
          await page
            .locator("[data-cover-index='2']")
            .evaluate((el) => getComputedStyle(el).clipPath),
          "none",
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
        await command(page, "关闭封面选择").click();
        assert.equal(
          await page
            .locator("#bg-image")
            .evaluate((el) => getComputedStyle(el).filter),
          "none",
        );
        await command(page, "切换首页封面").click();
        await page.locator("dialog.cover-picker[open]").waitFor();
        await page.locator("[data-cover-index='2']").tap();
        await page
          .locator("dialog.cover-picker")
          .waitFor({ state: "detached" });
        assert.equal(await page.locator(".cover-picker__reveal").count(), 0);
        assert.equal(
          await page.locator("#bg-image").getAttribute("src"),
          getHeroCoverSrc(2),
        );
      } else {
        assert.equal(await page.locator(".fan-screen__arc").isVisible(), true);
        await command(page, "关闭封面选择").click();
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => document.getElementById("bg-image")?.naturalWidth > 0,
      );
      assert.equal(
        await page.locator("#bg-image").getAttribute("src"),
        getHeroCoverSrc(expected),
      );
      if (width >= 768) {
        for (const from of ["/", "/bili"]) {
          if (from !== "/")
            await page.goto(`${base}${from}`, {
              waitUntil: "domcontentloaded",
            });
          await command(page, "控制台").click();
          await page.locator(".site-console-layer").waitFor();
          assert.equal(await command(page, "收起").count(), 0);
          await command(page, "切换封面").click();
          await page.locator("dialog.cover-picker[open]").waitFor();
          await page
            .locator(".site-console-layer")
            .waitFor({ state: "detached" });
          assert.equal(new URL(page.url()).pathname, "/");
          assert.equal(
            await page.evaluate(() => document.getElementById("root").inert),
            false,
          );
          assert.equal(await page.getByRole("slider").count(), 0);
          await command(page, "关闭封面选择").click();
          assert.notEqual(
            await page.evaluate(() => document.body.style.overflow),
            "hidden",
          );
        }
      }
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${width}: first cover 1, refresh cover ${expected}, no brightness UI/filter, responsive navigation${width >= 768 ? ", console-to-picker from home and subpage" : ""}`,
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
