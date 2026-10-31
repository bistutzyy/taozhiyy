const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const base = (process.argv[2] || 'http://127.0.0.1:5200').replace(/\/$/, '');
const out = path.resolve(__dirname, '../previews/project-gallery/.qa/motion-release');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/projects/`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__galleryDebug?.().loaded > 0 && window.__galleryDebug().autoRotate);
      const initial = await page.evaluate(() => window.__galleryDebug());
      await page.waitForTimeout(700);
      const moving = await page.evaluate(() => window.__galleryDebug());
      assert.ok(moving.frameCount > initial.frameCount);
      assert.notDeepEqual(moving.camera, initial.camera);
      assert.equal(await page.getByRole('button', { name: '暂停动态', exact: true }).getAttribute('aria-pressed'), 'true');
      const pixels = await page.locator('#gallery-canvas').screenshot({ path: path.join(out, `canvas-${width}.png`) });
      assert.ok((await sharp(pixels).stats()).channels[0].stdev > 10, 'canvas is nonblank');
      await page.locator('#gallery-canvas').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => window.__galleryDebug().position > .1 && window.__galleryDebug().autoRotate);
      await page.getByRole('button', { name: '暂停动态', exact: true }).click();
      await page.waitForTimeout(1700);
      const stopped = await page.evaluate(() => window.__galleryDebug());
      await page.waitForTimeout(500);
      assert.equal((await page.evaluate(() => window.__galleryDebug())).frameCount, stopped.frameCount);
      await page.locator('#reset-camera').click();
      await page.waitForTimeout(1700);
      assert.equal((await page.evaluate(() => window.__galleryDebug())).motionEnabled, false);
      await page.getByRole('button', { name: '开启动态', exact: true }).click();
      await page.waitForFunction(() => window.__galleryDebug().autoRotate);
      await page.locator('#open-project').click();
      assert.equal((await page.evaluate(() => window.__galleryDebug())).paused, true);
      await page.locator('#reader-back').click();
      await page.waitForFunction(() => !window.__galleryDebug().paused && window.__galleryDebug().autoRotate);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__galleryDebug?.().autoRotate);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: moving default, canvas pixels, browse resume, manual pause, detail suspension and reload`);
      await context.close();
    }
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${base}/projects/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__galleryDebug?.().loaded > 0);
    assert.equal((await page.evaluate(() => window.__galleryDebug())).motionEnabled, false);
    assert.equal(await page.getByRole('button', { name: '开启动态', exact: true }).getAttribute('aria-pressed'), 'false');
    await context.close();
    console.log('PASS reduced-motion preference');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
