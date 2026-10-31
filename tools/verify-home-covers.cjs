const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = process.argv[2] || "http://127.0.0.1:5202";
const storageKey = "taozhiyy.home-cover.v1";
const brightnessKey = "taozhiyy.home-cover-brightness.v1";
const out = path.resolve(
  __dirname,
  "../previews/project-gallery/.qa/home-covers",
);
const apiPreview = (route) =>
  route.fulfill({
    status: 503,
    contentType: "application/json",
    body: '{"error":"PREVIEW_ONLY"}',
  });
const frame = (page, index) =>
  page.locator(`dialog.cover-picker [data-cover-index="${index}"]`);
const command = (page, name) => page.getByRole("button", { name, exact: true });
const previewIndex = (page) =>
  page
    .locator("dialog.cover-picker [data-preview-index]")
    .getAttribute("data-preview-index");
const brightness = (page) =>
  page.getByRole("slider", { name: "亮度", exact: true });
const filter = (page, selector) =>
  page.locator(selector).evaluate((el) => getComputedStyle(el).filter);
const saved = (page, key) =>
  page.evaluate((key) => localStorage.getItem(key), key);
const shot = (page, name) =>
  page.screenshot({ path: path.join(out, `${name}.png`) });
async function readyHome(page) {
  await page.waitForFunction(
    () =>
      document.getElementById("bg-image")?.complete &&
      document.getElementById("bg-image").naturalWidth > 0,
  );
  await page
    .locator("div.flex-center.bg-violet-50")
    .waitFor({ state: "detached" });
}
async function openPicker(page, allReady = true) {
  await command(page, "切换首页封面").click();
  await page.locator("dialog.cover-picker[open]").waitFor();
  if (allReady)
    await page.waitForFunction(() => {
      const buttons = [
        ...document.querySelectorAll("dialog.cover-picker [data-cover-index]"),
      ];
      return (
        buttons.length === 4 && buttons.every((button) => !button.disabled)
      );
    });
  await page.waitForTimeout(750);
}
async function closedPicker(page) {
  await page.locator("dialog.cover-picker").waitFor({ state: "detached" });
  await page.waitForFunction(
    () =>
      document.body.style.overflow !== "hidden" &&
      document.body.style.position !== "fixed",
  );
}
async function choose(page, index, touch = false) {
  if (touch) await frame(page, index).tap();
  else await frame(page, index).click();
  await page.waitForFunction(
    (expected) =>
      document.querySelector("dialog.cover-picker [data-preview-index]")
        ?.dataset.previewIndex === String(expected),
    index,
  );
}
async function setRangeEnd(page, key) {
  await brightness(page).focus();
  await page.keyboard.press(key);
}
async function checkFit(page, width, height) {
  const result = await page
    .locator("dialog.cover-picker")
    .evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      const bad = [
        ...dialog.querySelectorAll(
          "button,input,[data-fit-text],.screening-command__tip",
        ),
      ]
        .filter((el) => {
          if (
            el.matches(".screening-command__tip") &&
            getComputedStyle(el).visibility === "hidden"
          )
            return false;
          const r = el.getBoundingClientRect();
          return (
            r.width &&
            r.height &&
            (r.left < -0.5 ||
              r.top < -0.5 ||
              r.right > innerWidth + 0.5 ||
              r.bottom > innerHeight + 0.5 ||
              (!el.matches(".screening-command") &&
                el.scrollWidth > el.clientWidth + 1))
          );
        })
        .map((el) => ({
          name: el.getAttribute("aria-label") || el.className,
          r: el.getBoundingClientRect().toJSON(),
          s: el.scrollWidth,
          c: el.clientWidth,
        }));
      return {
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
        bad,
        overflow: dialog.scrollWidth > dialog.clientWidth + 1,
      };
    });
  assert.ok(
    Math.abs(result.x) < 1 &&
      Math.abs(result.y) < 1 &&
      Math.abs(result.w - width) < 1 &&
      Math.abs(result.h - height) < 1,
    JSON.stringify(result),
  );
  assert.deepEqual(
    result.bad,
    [],
    `clipped scene ${width}x${height}: ${JSON.stringify(result.bad)}`,
  );
  assert.equal(result.overflow, false, "dialog must not overflow");
}
async function newPage(browser, options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", apiPreview);
  return { context, page, errors };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const [width, height] of [
      [1440, 900],
      [1024, 768],
      [768, 1024],
      [390, 844],
      [320, 568],
      [844, 390],
      [667, 375],
      [500, 400],
    ]) {
      const { context, page, errors } = await newPage(browser, {
        viewport: { width, height },
        hasTouch: width < 768,
        isMobile: width < 768,
      });
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await readyHome(page);
      const original = await page.locator("#bg-image").getAttribute("src");
      await openPicker(page);
      await checkFit(page, width, height);
      if (width < 768 && height > width) {
        const slides = await page.locator(".screening-slides").boundingBox();
        const projector = await page
          .locator(".screening-projector")
          .boundingBox();
        assert.ok(
          projector.y >= slides.y + slides.height - 1,
          "portrait projector belongs below the slides",
        );
      }
      assert.equal(await frame(page, 1).count(), 1);
      assert.equal(await page.locator(".aperture-dial").count(), 0);
      await choose(page, 2, width < 768);
      assert.equal(
        await page.locator("#bg-image").getAttribute("src"),
        original,
      );
      assert.equal(await saved(page, storageKey), null);
      await setRangeEnd(page, "Home");
      assert.equal(await brightness(page).inputValue(), "70");
      assert.equal(
        await filter(page, ".cover-picker__media"),
        "brightness(0.7)",
      );
      assert.equal(await filter(page, "#bg-image"), "brightness(1)");
      assert.equal(await saved(page, brightnessKey), null);
      await command(page, "重置亮度").click();
      assert.equal(await brightness(page).inputValue(), "100");
      await page.waitForFunction(() =>
        [...document.querySelectorAll("dialog.cover-picker img")].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );
      await page.waitForTimeout(350);
      await checkFit(page, width, height);
      await shot(page, `picker-${width}`);
      await command(page, "纯净观赏").click();
      assert.equal(
        await page.locator("dialog.cover-picker").getAttribute("data-clean"),
        "true",
      );
      assert.equal(
        await page.locator("dialog.cover-picker button:visible").count(),
        1,
      );
      assert.equal(
        await page
          .locator("dialog.cover-picker [data-preview-index]")
          .evaluate((el) => getComputedStyle(el).objectFit),
        "contain",
        "clean view shows the full original aspect ratio",
      );
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "返回封面编辑",
      );
      await checkFit(page, width, height);
      await shot(page, `clean-${width}`);
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator("dialog.cover-picker").getAttribute("data-clean"),
        "false",
      );
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "纯净观赏",
      );
      const before = await previewIndex(page);
      await command(page, "随机一景").click();
      assert.notEqual(await previewIndex(page), before);
      assert.equal(await saved(page, storageKey), null);
      await command(page, "纯净观赏").click();
      await command(page, "返回封面编辑").click();
      await page.keyboard.press("Escape");
      await closedPicker(page);
      assert.equal(
        await page.locator("#bg-image").getAttribute("src"),
        original,
      );
      assert.equal(await filter(page, "#bg-image"), "brightness(1)");
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "切换首页封面",
      );
      if (width === 1440) {
        await openPicker(page);
        await choose(page, 4);
        await setRangeEnd(page, "Home");
        await command(page, "使用此封面").click();
        assert.equal(
          await page.locator("dialog.cover-picker").getAttribute("data-phase"),
          "projecting",
        );
        await page.keyboard.press("Escape");
        await closedPicker(page);
        await page.waitForTimeout(650);
        assert.equal(
          await page.locator("#bg-image").getAttribute("src"),
          original,
        );
        assert.equal(await saved(page, storageKey), null);
        assert.equal(await saved(page, brightnessKey), null);
      }
      await openPicker(page);
      await choose(page, 3);
      await setRangeEnd(page, "End");
      await command(page, "使用此封面").click();
      await closedPicker(page);
      assert.ok(
        (await page.locator("#bg-image").getAttribute("src")).endsWith(
          "hero-3.webp",
        ),
      );
      assert.equal(await filter(page, "#bg-image"), "brightness(1.15)");
      assert.equal(await saved(page, storageKey), "3");
      assert.equal(await saved(page, brightnessKey), "115");
      await page.locator("#previous-image").waitFor({ state: "detached" });
      await shot(page, `applied-${width}`);
      await page.reload({ waitUntil: "domcontentloaded" });
      await readyHome(page);
      assert.equal(await filter(page, "#bg-image"), "brightness(1.15)");
      assert.equal(
        await filter(page, ".hero-wordmark"),
        "none",
        "text must not be dimmed",
      );
      await openPicker(page);
      assert.equal(await brightness(page).inputValue(), "115");
      await setRangeEnd(page, "Home");
      await command(page, "放映并应用封面").click();
      await closedPicker(page);
      assert.ok(
        (await page.locator("#bg-image").getAttribute("src")).endsWith(
          "hero-3.webp",
        ),
      );
      assert.equal(
        await filter(page, "#bg-image"),
        "brightness(0.7)",
        "same-index brightness applies",
      );
      if (width === 1440) {
        await openPicker(page);
        await choose(page, 4);
        await setRangeEnd(page, "End");
        await command(page, "使用此封面").click();
        await closedPicker(page);
        assert.ok(
          (await page.locator("#bg-image").getAttribute("src")).endsWith(
            "hero-4.webp",
          ),
        );
        assert.equal(
          await filter(page, "#bg-image"),
          "brightness(1.15)",
          "subsequent GSAP transitions preserve new brightness",
        );
      }
      await page.evaluate(() => scrollTo(0, 300));
      await page.waitForTimeout(200);
      const scroll = await page.evaluate(() => scrollY);
      await page.evaluate(() =>
        window.dispatchEvent(new CustomEvent("showHeroPreview")),
      );
      await page.locator("dialog.cover-picker[open]").waitFor();
      await page.keyboard.press("Escape");
      await closedPicker(page);
      assert.ok(Math.abs((await page.evaluate(() => scrollY)) - scroll) < 2);
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${width}x${height}: scene bounds, real images, touch/click, shuffle, brightness, clean view, cancel, both apply controls, persistence and focus`,
      );
      await context.close();
    }

    const reduced = await newPage(browser, {
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    await reduced.context.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("blocked");
        },
      }),
    );
    await reduced.page.goto(`${base}/?cover=select`, {
      waitUntil: "domcontentloaded",
    });
    await reduced.page.waitForFunction(
      () => !document.querySelector('[data-cover-index="2"]').disabled,
    );
    await choose(reduced.page, 2);
    await setRangeEnd(reduced.page, "Home");
    await command(reduced.page, "使用此封面").click();
    await closedPicker(reduced.page);
    assert.equal(await filter(reduced.page, "#bg-image"), "brightness(0.7)");
    await reduced.page.waitForTimeout(100);
    assert.equal(await reduced.page.locator("#previous-image").count(), 0);
    assert.deepEqual(reduced.errors, []);
    await reduced.context.close();
    console.log("PASS reduced motion and blocked storage with brightness");

    const slow = await newPage(browser, {
      viewport: { width: 390, height: 844 },
    });
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await slow.page.route("**/hero-4.webp", async (route) => {
      await gate;
      await route.continue();
    });
    try {
      await slow.page.goto(base, { waitUntil: "domcontentloaded" });
      await readyHome(slow.page);
      const originalStyles = await slow.page.evaluate(() => {
        document.body.style.setProperty("overflow", "auto", "important");
        document.body.style.setProperty("padding-right", "7px", "important");
        return document.body.getAttribute("style");
      });
      await openPicker(slow.page, false);
      assert.equal(await frame(slow.page, 4).isDisabled(), true);
      assert.equal(await frame(slow.page, 4).getAttribute("aria-busy"), "true");
      for (let i = 0; i < 4; i++) {
        await command(slow.page, "随机一景").click();
        assert.notEqual(await previewIndex(slow.page), "4");
      }
      release();
      await slow.page.waitForFunction(
        () => !document.querySelector('[data-cover-index="4"]').disabled,
      );
      await choose(slow.page, 4);
      await command(slow.page, "关闭封面选择").click();
      await closedPicker(slow.page);
      assert.equal(
        await slow.page.evaluate(() => document.body.getAttribute("style")),
        originalStyles,
      );
      assert.equal(await saved(slow.page, storageKey), null);
      const axisStyles = () =>
        [
          "overflow",
          "overflow-x",
          "overflow-y",
          "position",
          "padding-right",
        ].map((property) => [
          property,
          document.body.style.getPropertyValue(property),
          document.body.style.getPropertyPriority(property),
        ]);
      await slow.page.evaluate(() => {
        document.body.style.removeProperty("overflow");
        document.body.style.setProperty("overflow-y", "hidden", "important");
      });
      const originalAxes = await slow.page.evaluate(axisStyles);
      await openPicker(slow.page);
      await command(slow.page, "关闭封面选择").click();
      await closedPicker(slow.page);
      assert.deepEqual(
        await slow.page.evaluate(axisStyles),
        originalAxes,
        "axis-specific overflow and priorities must survive close",
      );
    } finally {
      release();
      await slow.context.close();
    }
    console.log(
      "PASS delayed media, ready-only shuffle and exact body restoration",
    );

    const failing = await newPage(browser, {
      viewport: { width: 1366, height: 768 },
    });
    let fail = true;
    await failing.page.route("**/hero-4.webp", (route) =>
      fail ? route.abort() : route.continue(),
    );
    await failing.page.goto(base, { waitUntil: "domcontentloaded" });
    await readyHome(failing.page);
    await openPicker(failing.page, false);
    await failing.page.locator(".cover-picker__retry").waitFor();
    assert.equal(await frame(failing.page, 4).isDisabled(), true);
    for (let i = 0; i < 3; i++) {
      await command(failing.page, "随机一景").click();
      assert.notEqual(await previewIndex(failing.page), "4");
    }
    fail = false;
    await failing.page.locator(".cover-picker__retry").click();
    await failing.page.waitForFunction(
      () => !document.querySelector('[data-cover-index="4"]').disabled,
    );
    await choose(failing.page, 4);
    await command(failing.page, "使用此封面").click();
    await closedPicker(failing.page);
    assert.ok(
      (await failing.page.locator("#bg-image").getAttribute("src")).endsWith(
        "hero-4.webp",
      ),
    );
    await failing.context.close();
    console.log("PASS failed slide retry and shuffle exclusion");

    const savedFailure = await newPage(browser, {
      viewport: { width: 390, height: 844 },
    });
    await savedFailure.context.addInitScript(
      (key) => localStorage.setItem(key, "4"),
      storageKey,
    );
    await savedFailure.page.route("**/hero-4.webp", (route) => route.abort());
    await savedFailure.page.goto(`${base}/?cover=select`, {
      waitUntil: "domcontentloaded",
    });
    await readyHome(savedFailure.page);
    await savedFailure.page.waitForFunction(
      () =>
        document.querySelector("[data-preview-index]")?.dataset.previewIndex ===
        "1",
    );
    assert.equal(await saved(savedFailure.page, storageKey), "4");
    await savedFailure.page.keyboard.press("Escape");
    await closedPicker(savedFailure.page);
    await savedFailure.context.close();
    console.log(
      "PASS saved-cover fallback without overwriting explicit preference",
    );

    const retry = await newPage(browser, {
      viewport: { width: 390, height: 844 },
    });
    let failCurrent = true;
    await retry.page.route("**/hero-1.webp", (route) =>
      failCurrent ? route.abort() : route.continue(),
    );
    await retry.page.goto(base, { waitUntil: "domcontentloaded" });
    await command(retry.page, "重新加载封面").waitFor();
    assert.equal(
      await retry.page.locator("#bg-image").evaluate((img) => img.naturalWidth),
      0,
    );
    failCurrent = false;
    await command(retry.page, "重新加载封面").click();
    await readyHome(retry.page);
    assert.ok(
      await retry.page
        .locator("#bg-image")
        .evaluate((img) => img.naturalWidth > 0),
    );
    await retry.context.close();
    console.log("PASS retry replaces the actual failed Hero image");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
