const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const sharp = require("sharp");

const base = process.argv[2] || "http://127.0.0.1:5203";
const out = path.resolve(__dirname, "../previews/project-gallery/.qa/cover-quadrants");
const key = "taozhiyy.home-cover.v1";
const brightnessKey = "taozhiyy.home-cover-brightness.v1";
const leaf = (page, index) => page.locator(`dialog.cover-picker [data-cover-index="${index}"]`);
const panel = (page, index) => page.locator(`.cover-quadrants__panel[data-quad-index="${index}"]`);
const command = (page, name) => page.getByRole("button", { name, exact: true });
const highlight = async (page, index) => page.waitForFunction((index) =>
  document.querySelector(".cover-quadrants")?.dataset.highlightIndex === String(index ?? ""), index);
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`) });

async function open(page) {
  await command(page, "切换首页封面").click();
  await page.locator("dialog.cover-picker[open]").waitFor();
}
async function allReady(page) {
  await page.waitForFunction(() => {
    const leaves = [...document.querySelectorAll("dialog.cover-picker [data-cover-index]")];
    return leaves.length === 4 && leaves.every(button => !button.disabled);
  }, null, { timeout: 65000 });
}
async function pixelSamples(buffer) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  return [[.025, .3], [.975, .25], [.025, .78], [.975, .78]].map(([x, y]) => {
    const start = (Math.floor(info.height * y) * info.width + Math.floor(info.width * x)) * info.channels;
    return (data[start] + data[start + 1] + data[start + 2]) / 3;
  });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const { getHeroCoverSrc } = await import("../main/src/components/heroCoverAssets.js");
  const palette = [[90, 135, 185], [225, 150, 85], [85, 180, 130], [185, 115, 170]];
  const fixtures = await Promise.all(palette.map(([r, g, b]) =>
    sharp({ create: { width: 640, height: 400, channels: 3, background: { r, g, b } } }).png().toBuffer()));
  const fileIndex = url => [1, 2, 3, 4].find(index => new URL(url).pathname.endsWith(getHeroCoverSrc(index).split("/").at(-1)));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  async function pageFor(options = {}, images = true) {
    const context = await browser.newContext(options);
    await context.addInitScript(() => { Math.random = () => 0.1; });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
    if (images) await page.route("**/hero-*.webp", route => {
      const index = fileIndex(route.request().url());
      return index ? route.fulfill({ contentType: "image/png", body: fixtures[index - 1] }) : route.continue();
    });
    return { context, page, errors };
  }
  try {
    const { context, page, errors } = await pageFor({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.getElementById("bg-image")?.naturalWidth > 0);
    await open(page); await allReady(page);
    await highlight(page, null);
    assert.equal(await page.locator('.cover-quadrants [data-lit="true"]').count(), 0);
    assert.equal(await page.locator(".cover-quadrants__panel img").count(), 4);
    assert.equal(await page.locator(".cover-picker__preview").count(), 0);
    const dark = await pixelSamples(await page.screenshot());
    await leaf(page, 2).locator("[data-fan-hit]").hover();
    await highlight(page, 2); await page.waitForTimeout(320);
    const lit = await pixelSamples(await page.screenshot());
    assert.ok(lit[1] > dark[1] * 2.3, JSON.stringify({ dark, lit }));
    for (const index of [0, 2, 3]) assert.ok(Math.abs(lit[index] - dark[index]) < 3, `${index} unexpectedly brightened`);
    await page.mouse.move(5, 5); await highlight(page, null);
    await leaf(page, 1).focus(); await highlight(page, 1);
    await leaf(page, 2).locator("[data-fan-hit]").hover(); await highlight(page, 2);
    await page.mouse.move(5, 5); await highlight(page, 1);
    assert.equal(await page.locator(".cover-quadrants").getAttribute("data-preview-index"), "1", "focus fallback must also change the apply target");
    await command(page, "关闭封面选择").focus(); await highlight(page, null);
    await command(page, "随机一景").click();
    const chosen = await page.locator(".cover-quadrants").getAttribute("data-preview-index");
    await highlight(page, Number(chosen));
    await leaf(page, Number(chosen) === 2 ? 3 : 2).locator("[data-fan-hit]").hover();
    await page.mouse.move(5, 5); await highlight(page, Number(chosen));
    assert.equal(await page.locator(".cover-quadrants").getAttribute("data-preview-index"), chosen, "command fallback must also change the apply target");
    await command(page, "纯净观赏").click();
    assert.equal(await page.locator(".cover-quadrants").isVisible(), false);
    assert.equal(await page.locator(".cover-picker__preview").evaluate(img => getComputedStyle(img).objectFit), "contain");
    assert.equal(await page.locator(".cover-picker__preview").getAttribute("src"), getHeroCoverSrc(Number(chosen)));
    await page.keyboard.press("Escape"); await highlight(page, null);
    assert.equal(await page.locator(".cover-quadrants").isVisible(), true);
    await page.keyboard.press("Escape");
    await page.locator("dialog.cover-picker").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "切换首页封面");
    await open(page); await allReady(page); await highlight(page, null);
    await leaf(page, 3).focus(); await highlight(page, 3);
    await leaf(page, 4).locator("[data-fan-hit]").click();
    assert.equal(await page.locator("dialog.cover-picker").getAttribute("data-phase"), "unfolding");
    await highlight(page, 4);
    await page.locator("dialog.cover-picker").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), "4");
    assert.ok((await page.locator("#bg-image").getAttribute("src")).endsWith("hero-4.webp"));
    assert.equal(await page.locator("#bg-image").evaluate(img => Number(getComputedStyle(img).opacity)), 1);
    assert.equal(await page.locator("#previous-image").count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log("PASS four-panel pixel brightness, pointer/focus fallback, clean view, cancellation and captured selection");

    const failure = await pageFor({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    let failed = false;
    await failure.page.route("**/hero-4.webp", route => {
      if (!failed) { failed = true; return route.abort(); }
      return route.fulfill({ contentType: "image/png", body: fixtures[3] });
    });
    await failure.page.goto(base, { waitUntil: "domcontentloaded" });
    await open(failure.page);
    await failure.page.waitForFunction(() => document.querySelector('[aria-label="重试加载：FRAME 04"]'));
    assert.equal(await panel(failure.page, 4).locator("img").count(), 0);
    await command(failure.page, "重试加载：FRAME 04").click();
    await allReady(failure.page);
    await leaf(failure.page, 4).focus(); await highlight(failure.page, 4);
    assert.equal(await panel(failure.page, 4).locator("img").count(), 1);
    await leaf(failure.page, 4).press("Enter");
    await failure.page.locator("dialog.cover-picker").waitFor({ state: "detached" });
    assert.equal(await failure.page.locator(".cover-picker__reveal").count(), 0);
    assert.deepEqual(failure.errors, []);
    await failure.context.close();
    console.log("PASS failed-quadrant retry and reduced-motion application");

    for (const width of [1440, 390]) {
      const real = await pageFor({ viewport: { width, height: width === 1440 ? 900 : 844 }, hasTouch: width < 768, isMobile: width < 768 }, false);
      await real.page.goto(`${base}/?cover=select`, { waitUntil: "domcontentloaded" });
      await real.page.locator("dialog.cover-picker[open]").waitFor();
      await allReady(real.page); await highlight(real.page, null);
      await real.page.waitForTimeout(350);
      await shot(real.page, `dark-${width}`);
      if (width === 1440) await leaf(real.page, 2).locator("[data-fan-hit]").hover();
      else await leaf(real.page, 2).focus();
      await highlight(real.page, 2); await real.page.waitForTimeout(350);
      await shot(real.page, `lit-2-${width}`);
      await leaf(real.page, 3).focus(); await highlight(real.page, 3);
      await real.page.waitForTimeout(350); await shot(real.page, `lit-3-${width}`);
      assert.equal(await real.page.locator('.cover-quadrants [data-lit="true"]').count(), 1);
      assert.equal(await real.page.locator(".cover-quadrants__panel img").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)), true);
      assert.equal(await real.page.locator("dialog.cover-picker").evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      assert.equal(await real.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await command(real.page, "关闭封面选择").click();
      assert.equal(await real.page.evaluate(key => localStorage.getItem(key), brightnessKey), null);
      assert.deepEqual(real.errors, []);
      await real.context.close();
      console.log(`PASS ${width}: all real wallpapers, ${width < 768 ? "mobile grid" : "skewed frames"}, highlighting and viewport fit`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
