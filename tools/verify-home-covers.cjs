const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const base = process.argv[2] || "http://127.0.0.1:5202";
const storageKey = "taozhiyy.home-cover.v1";
const out = path.resolve(
  __dirname,
  "../previews/project-gallery/.qa/home-covers",
);
const apiPreview = (route) =>
  route.fulfill({
    status: 503,
    contentType: "application/json",
    body: '{"error":"PREVIEW_ONLY","message":"Local UI preview"}',
  });
const frame = (page, index) =>
  page.locator(`dialog.cover-picker [data-cover-index="${index}"]`);
const previewIndex = (page) =>
  page
    .locator("dialog.cover-picker [data-preview-index]")
    .last()
    .getAttribute("data-preview-index");

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
  await page.getByRole("button", { name: "切换首页封面", exact: true }).click();
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
}
async function closedPicker(page) {
  await page.locator("dialog.cover-picker").waitFor({ state: "detached" });
  await page.waitForFunction(
    () =>
      document.body.style.overflow !== "hidden" &&
      document.body.style.position !== "fixed",
  );
}
async function turnDial(page, touch = false) {
  const box = await page.locator(".aperture-dial__body").boundingBox();
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2,
    radius = box.width * 0.29;
  const point = (step) => {
    const angle = ((45 - (step * 90) / 12) * Math.PI) / 180;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  };
  const start = point(0);
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  if (cdp)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 1 }],
    });
  else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
  }
  for (let step = 1; step <= 12; step++) {
    const next = point(step);
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...next, id: 1 }],
      });
    else await page.mouse.move(next.x, next.y);
    await page.waitForTimeout(12);
  }
  await page.waitForTimeout(300);
  if (cdp) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else await page.mouse.up();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-preview-index]")?.dataset.previewIndex ===
      "2",
  );
  await page.waitForTimeout(750);
  const rotation = await page
    .locator(".aperture-dial__body")
    .evaluate((el) =>
      parseFloat(el.style.getPropertyValue("--counter-rotation")),
    );
  assert.ok(
    Math.abs(rotation / 90 - Math.round(rotation / 90)) < 0.01,
    `dial must snap, got ${rotation}`,
  );
}
async function checkFit(page, width, height) {
  const result = await page
    .locator("dialog.cover-picker")
    .evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      const bad = [...dialog.querySelectorAll("button")]
        .filter((button) => {
          const b = button.getBoundingClientRect();
          return (
            b.width &&
            (b.left < 0 ||
              b.top < 0 ||
              b.right > innerWidth + 1 ||
              b.bottom > innerHeight + 1 ||
              button.scrollWidth > button.clientWidth + 1)
          );
        })
        .map(
          (button) =>
            button.getAttribute("aria-label") || button.textContent.trim(),
        );
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
  assert.deepEqual(result.bad, [], `clipped controls ${width}x${height}`);
  assert.equal(result.overflow, false);
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
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: width < 768,
        isMobile: width < 768,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/**", apiPreview);
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await readyHome(page);
      const nav = await page
        .getByRole("button", { name: "切换首页封面", exact: true })
        .boundingBox();
      assert.ok(
        nav.x >= 0 && nav.x + nav.width <= width,
        "mobile and desktop entry must fit",
      );
      const original = await page.locator("#bg-image").getAttribute("src");
      await openPicker(page);
      await checkFit(page, width, height);
      if (width === 1440 || width === 390) {
        await turnDial(page, width === 390);
        assert.equal(
          await page.evaluate((key) => localStorage.getItem(key), storageKey),
          null,
          "rotation must not persist",
        );
        const grip = page.getByRole("slider", { name: "旋转光圈选择封面" });
        await grip.focus();
        for (const [key, index] of [
          ["Home", "1"],
          ["End", "4"],
          ["ArrowRight", "1"],
          ["ArrowLeft", "4"],
          ["Home", "1"],
        ]) {
          await page.keyboard.press(key);
          await page.waitForFunction(
            (expected) =>
              document.querySelector("[data-preview-index]")?.dataset
                .previewIndex === expected,
            index,
          );
        }
      }
      assert.equal(
        await page.locator("dialog.cover-picker [data-cover-index]").count(),
        4,
      );
      assert.ok(
        !/锦瑟|一弦|沧海月明|庄生|指南针/.test(
          await page.locator("dialog.cover-picker").innerText(),
        ),
      );
      await frame(page, 2).click();
      await page.waitForFunction(
        () =>
          document.querySelector("dialog.cover-picker [data-preview-index]")
            ?.dataset.previewIndex === "2",
      );
      assert.equal(
        await page.locator("#bg-image").getAttribute("src"),
        original,
        "preview must not apply",
      );
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), storageKey),
        null,
      );
      if (width >= 768) {
        await frame(page, 4).click();
        await page.waitForFunction(
          () =>
            document.querySelector("dialog.cover-picker [data-preview-index]")
              ?.dataset.previewIndex === "4",
        );
        assert.equal(
          await page.locator("#bg-image").getAttribute("src"),
          original,
          "thumbnail must only preview",
        );
        await frame(page, 2).click();
      }
      await page.waitForFunction(() =>
        [...document.querySelectorAll("dialog.cover-picker img")].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(out, `picker-${width}.png`) });
      await page.keyboard.press("Escape");
      await closedPicker(page);
      assert.equal(
        await page.locator("#bg-image").getAttribute("src"),
        original,
      );
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "切换首页封面",
      );
      if (width === 1440) {
        await openPicker(page);
        await frame(page, 4).click();
        await page
          .getByRole("button", { name: "使用此封面", exact: true })
          .click();
        assert.equal(
          await page.locator("dialog.cover-picker").getAttribute("data-phase"),
          "shutter",
        );
        await page.keyboard.press("Escape");
        await closedPicker(page);
        await page.waitForTimeout(700);
        assert.equal(
          await page.locator("#bg-image").getAttribute("src"),
          original,
          "closing a shutter must cancel the queued apply",
        );
        assert.equal(
          await page.evaluate((key) => localStorage.getItem(key), storageKey),
          null,
        );
      }
      await openPicker(page);
      await frame(page, 3).click();
      await page
        .getByRole("button", { name: "使用此封面", exact: true })
        .click();
      await closedPicker(page);
      assert.ok(
        (await page.locator("#bg-image").getAttribute("src")).endsWith(
          "hero-3.webp",
        ),
      );
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), storageKey),
        "3",
      );
      await page.locator("#previous-image").waitFor({ state: "detached" });
      await page.screenshot({ path: path.join(out, `applied-${width}.png`) });
      await page.reload({ waitUntil: "domcontentloaded" });
      await readyHome(page);
      console.log(`CHECK ${width}: restored selection after reload`);
      assert.ok(
        (await page.locator("#bg-image").getAttribute("src")).endsWith(
          "hero-3.webp",
        ),
      );
      await openPicker(page);
      await frame(page, 4).focus();
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => document.activeElement === document.body))
        await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() =>
          document
            .querySelector("dialog.cover-picker")
            .contains(document.activeElement),
        ),
        true,
      );
      await page
        .getByRole("button", { name: "关闭封面选择", exact: true })
        .click();
      await closedPicker(page);
      assert.ok(
        (await page.locator("#bg-image").getAttribute("src")).endsWith(
          "hero-3.webp",
        ),
      );
      await page.evaluate(() => {
        scrollTo(0, 300);
      });
      await page.waitForTimeout(250);
      const scroll = await page.evaluate(() => scrollY);
      await page.evaluate(() =>
        window.dispatchEvent(new CustomEvent("showHeroPreview")),
      );
      await page.locator("dialog.cover-picker[open]").waitFor();
      await page.keyboard.press("Escape");
      await closedPicker(page);
      assert.ok(
        Math.abs((await page.evaluate(() => scrollY)) - scroll) < 2,
        "cancel restores scroll",
      );
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${width}x${height}: images, bounds, preview/cancel, center confirmation, persistence, focus and scrolling`,
      );
      await context.close();
    }
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("blocked");
        },
      }),
    );
    const page = await context.newPage();
    await page.route("**/api/**", apiPreview);
    await page.goto(`${base}/?cover=select`, { waitUntil: "domcontentloaded" });
    await page.locator("dialog.cover-picker[open]").waitFor();
    await page.waitForFunction(
      () => !document.querySelector('[data-cover-index="2"]').disabled,
    );
    await frame(page, 2).click();
    await page.getByRole("button", { name: "使用此封面", exact: true }).click();
    await closedPicker(page);
    assert.ok(
      (await page.locator("#bg-image").getAttribute("src")).endsWith(
        "hero-2.webp",
      ),
    );
    await page.waitForTimeout(100);
    assert.equal(
      await page.locator("#previous-image").count(),
      0,
      "reduced motion has no lingering image transition",
    );
    await context.close();
    console.log("PASS reduced motion and blocked storage");

    const slow = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const slowPage = await slow.newPage();
    slowPage.setDefaultTimeout(20000);
    await slowPage.route("**/api/**", apiPreview);
    let releaseMedia;
    const mediaGate = new Promise((resolve) => {
      releaseMedia = resolve;
    });
    await slowPage.route("**/hero-4.webp", async (route) => {
      await mediaGate;
      await route.continue();
    });
    try {
      await slowPage.goto(base, { waitUntil: "domcontentloaded" });
      await readyHome(slowPage);
      const originalStyles = await slowPage.evaluate(() => {
        document.body.style.setProperty("overflow", "auto", "important");
        document.body.style.setProperty("padding-right", "7px", "important");
        return document.body.getAttribute("style");
      });
      await openPicker(slowPage, false);
      assert.equal(await frame(slowPage, 4).isDisabled(), true);
      assert.equal(await frame(slowPage, 4).getAttribute("aria-busy"), "true");
      await frame(slowPage, 4).evaluate((button) => button.click());
      assert.ok(
        (await slowPage.locator("#bg-image").getAttribute("src")).endsWith(
          "hero-1.webp",
        ),
      );
      assert.equal(await slowPage.locator(".cover-picker__retry").count(), 0);
      releaseMedia();
      await slowPage.waitForFunction(
        () => !document.querySelector('[data-cover-index="4"]').disabled,
      );
      await frame(slowPage, 4).click();
      await slowPage.waitForFunction(
        () =>
          document.querySelector("dialog.cover-picker [data-preview-index]")
            ?.dataset.previewIndex === "4",
      );
      await slowPage
        .getByRole("button", { name: "关闭封面选择", exact: true })
        .click();
      await closedPicker(slowPage);
      assert.equal(
        await slowPage.evaluate(() => document.body.getAttribute("style")),
        originalStyles,
      );
      assert.ok(
        (await slowPage.locator("#bg-image").getAttribute("src")).endsWith(
          "hero-1.webp",
        ),
      );
      console.log(
        "PASS slow media, unavailable frame guards and exact body style restoration",
      );
    } finally {
      releaseMedia();
      await slow.close();
    }

    const failing = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    const failedPage = await failing.newPage();
    await failedPage.route("**/api/**", apiPreview);
    let fail = true;
    await failedPage.route("**/hero-4.webp", (route) =>
      fail ? route.abort() : route.continue(),
    );
    await failedPage.goto(base, { waitUntil: "domcontentloaded" });
    await readyHome(failedPage);
    await openPicker(failedPage, false);
    await failedPage.locator(".cover-picker__retry").waitFor();
    assert.equal(await frame(failedPage, 4).isDisabled(), true);
    assert.ok(
      (await failedPage.locator("#bg-image").getAttribute("src")).endsWith(
        "hero-1.webp",
      ),
    );
    fail = false;
    await failedPage.locator(".cover-picker__retry").click();
    await failedPage.waitForFunction(
      () => !document.querySelector('[data-cover-index="4"]').disabled,
    );
    await failedPage.waitForFunction(() => {
      const img = document.querySelector('[data-cover-index="4"] img');
      return img?.complete && img.naturalWidth > 0;
    });
    await frame(failedPage, 4).click();
    await failedPage
      .getByRole("button", { name: "使用此封面", exact: true })
      .click();
    await closedPicker(failedPage);
    assert.ok(
      (await failedPage.locator("#bg-image").getAttribute("src")).endsWith(
        "hero-4.webp",
      ),
    );
    await failing.close();
    console.log("PASS failed media, explicit retry and image recovery");

    const savedFailure = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const savedPage = await savedFailure.newPage();
    savedPage.setDefaultTimeout(20000);
    await savedPage.addInitScript(
      (key) => localStorage.setItem(key, "4"),
      storageKey,
    );
    await savedPage.route("**/api/**", apiPreview);
    await savedPage.route("**/hero-4.webp", (route) => route.abort());
    await savedPage.goto(`${base}/?cover=select`, {
      waitUntil: "domcontentloaded",
    });
    await readyHome(savedPage);
    await savedPage.waitForFunction(
      () =>
        document.querySelector("dialog.cover-picker [data-preview-index]")
          ?.dataset.previewIndex === "1",
      null,
      { timeout: 5000 },
    );
    await savedPage.waitForFunction(
      () =>
        Math.abs(
          parseFloat(
            document
              .querySelector(".aperture-dial__body")
              .style.getPropertyValue("--counter-rotation"),
          ) % 360,
        ) < 0.1,
    );
    assert.equal(
      await savedPage.evaluate((key) => localStorage.getItem(key), storageKey),
      "4",
      "automatic fallback must not rewrite the explicit preference",
    );
    await savedPage.keyboard.press("Escape");
    await closedPicker(savedPage);
    await savedFailure.close();
    console.log(
      "PASS saved-image failure falls back in both the home and open picker",
    );

    const currentFailure = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const currentPage = await currentFailure.newPage();
    currentPage.setDefaultTimeout(20000);
    let failCurrent = true;
    await currentPage.route("**/api/**", apiPreview);
    await currentPage.route("**/hero-1.webp", (route) =>
      failCurrent ? route.abort() : route.continue(),
    );
    await currentPage.goto(base, { waitUntil: "domcontentloaded" });
    await currentPage
      .getByRole("button", { name: "重新加载封面", exact: true })
      .waitFor();
    assert.equal(
      await currentPage
        .locator("#bg-image")
        .evaluate((image) => image.naturalWidth),
      0,
    );
    failCurrent = false;
    await currentPage
      .getByRole("button", { name: "重新加载封面", exact: true })
      .click();
    await readyHome(currentPage);
    assert.ok(
      await currentPage
        .locator("#bg-image")
        .evaluate((image) => image.naturalWidth > 0),
    );
    await openPicker(currentPage);
    assert.equal(await frame(currentPage, 1).isEnabled(), true);
    await currentPage.keyboard.press("Escape");
    await closedPicker(currentPage);
    await currentFailure.close();
    console.log("PASS retry remounts the actual failed homepage image");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
