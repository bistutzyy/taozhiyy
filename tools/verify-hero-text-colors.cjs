const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const sharp = require("sharp");

const base = process.argv[2] || "http://127.0.0.1:5203";
const out = path.resolve(__dirname, "../.qa/hero-colors");
const rgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
const luminance = (color) => color.map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);

async function measureText(page, selector) {
  return page.locator(selector).evaluate((node) => {
    const style = getComputedStyle(node), r = node.getBoundingClientRect();
    return {
      x: r.x, y: r.y, width: r.width, height: r.height,
      font: style.fontFamily, size: style.fontSize, weight: style.fontWeight,
      lineHeight: style.lineHeight,
    };
  });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const { getHeroTextStyle } = await import(pathToFileURL(path.resolve(__dirname, "../main/src/components/heroWordmarkTheme.js")));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const [width, height] of [[320, 740], [390, 844], [1440, 900]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: {} }));
      await page.goto(`${base}/?cover=select`, { waitUntil: "domcontentloaded" });
      for (const index of [1, 2, 3, 4]) {
        if (index !== 1) await page.getByRole("button", { name: "切换首页封面", exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll("[data-cover-index]").length === 4 && [...document.querySelectorAll("[data-cover-index]")].every((node) => !node.disabled));
        const leaf = page.locator(`[data-cover-index="${index}"]`);
        await leaf.focus();
        await leaf.press("Enter");
        await page.locator("dialog.cover-picker").waitFor({ state: "detached" });
        await page.waitForFunction(() => document.getElementById("bg-image")?.naturalWidth > 0);
        assert.equal(await page.locator("[data-home-cover]").getAttribute("data-home-cover"), String(index));
        const colors = getHeroTextStyle(index);
        const actualTitle = await page.locator(".hero-welcome").evaluate((node) => getComputedStyle(node).color);
        assert.deepEqual(rgb(actualTitle), colors["--hero-title-ink"].slice(1).match(/../g).map((v) => parseInt(v, 16)));
        assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue("--hero-nav-ink")), colors["--hero-nav-ink"]);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        if (width >= 768) {
          assert.deepEqual(await page.locator(".hero-nav-at-top .nav-hover-btn").first().evaluate((node) => getComputedStyle(node).color), actualTitle);
        }
        const selectors = [".hero-welcome", ".hero-description", ".hero-signature", ".hero-wordmark"];
        const geometry = [];
        for (const selector of selectors) geometry.push(await measureText(page, selector));
        const neutral = await page.addStyleTag({ content: ".hero-welcome,.hero-description,.hero-signature {color:#fff!important;text-shadow:none!important;-webkit-text-stroke:0 transparent!important}.hero-wordmark-svg{filter:none!important}" });
        for (const [i, selector] of selectors.entries()) assert.deepEqual(await measureText(page, selector), geometry[i], "color changes must not alter typography or layout");
        await neutral.evaluate((node) => node.remove());

        const rendered = await page.screenshot({ path: path.join(out, `verified-${width}-${index}.png`) });
        const hidden = await page.addStyleTag({ content: ".hero-welcome {visibility:hidden!important}" });
        const background = await page.screenshot();
        await hidden.evaluate((node) => node.remove());
        const foreground = rgb(actualTitle);
        const fgLum = luminance(foreground);
        const a = await sharp(rendered).removeAlpha().raw().toBuffer();
        const b = await sharp(background).removeAlpha().raw().toBuffer();
        const r = geometry[0], ratios = [];
        for (let y = Math.max(0, Math.ceil(r.y)); y < Math.min(height, r.y + r.height); y++) {
          for (let x = Math.max(0, Math.ceil(r.x)); x < Math.min(width, r.x + r.width); x++) {
            const offset = (y * width + x) * 3;
            if ([0, 1, 2].every((c) => Math.abs(a[offset + c] - foreground[c]) <= 3) && [0, 1, 2].some((c) => Math.abs(a[offset + c] - b[offset + c]) > 8)) {
              const bgLum = luminance([b[offset], b[offset + 1], b[offset + 2]]);
              ratios.push((Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05));
            }
          }
        }
        assert.ok(ratios.length > 40, "visible title pixels must render over the actual image");
        ratios.sort((x, y) => x - y);
        // Photo sampling is a regression diagnostic, not a complete WCAG audit.
        const median = ratios[Math.floor(ratios.length / 2)];
        assert.ok(median >= 3, `title median photo contrast ${median.toFixed(2)} at ${width}/${index}`);
        console.log(`PASS ${width} cover ${index}: current palette, unchanged type/layout, visible title pixels, median photo contrast ${median.toFixed(2)}`);
      }
      if (width < 768) await page.getByRole("button", { name: "打开导航菜单", exact: true }).click();
      await page.getByRole("link", { name: "关于我", exact: true }).first().click();
      await page.waitForURL("**/about");
      await page.waitForFunction(() => !document.documentElement.style.getPropertyValue("--hero-nav-ink"));
      assert.equal(await page.locator(".hero-nav-at-top").count(), 0);
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
