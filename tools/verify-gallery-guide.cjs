const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const base = (process.argv[2] || 'http://127.0.0.1:5200').replace(/\/$/, '');
const out = path.resolve(__dirname, '../previews/project-gallery/.qa/guide');
const title = '项目星空 · 板块介绍';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [], badAssets = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.url().startsWith(`${base}/projects/`) && response.status() >= 400) badAssets.push(response.url()); });
      await page.goto(`${base}/projects/`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__galleryDebug?.().loaded > 0);
      assert.equal((await page.evaluate(() => window.__galleryDebug())).selected, 'project-guide');
      assert.match(await page.locator('.collection-count').innerText(), /09 \+ GUIDE/);
      assert.equal(await page.locator('[data-project="project-guide"]').count(), 1);
      for (const theme of ['cosmos', 'silver']) {
        await page.locator(`.header-actions [data-theme-choice="${theme}"]`).click();
        const pixels = await page.locator('#gallery-canvas').screenshot({ path: path.join(out, `scene-${theme}-${width}.png`) });
        assert.ok((await sharp(pixels).stats()).channels[0].stdev > 10, 'scene must be nonblank');
        await page.getByRole('button', { name: '查看介绍', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: title, exact: true });
        await dialog.waitFor();
        assert.equal((await page.evaluate(() => window.__galleryDebug())).paused, true);
        assert.equal(await dialog.locator('#detail-demo, #detail-source').count(), 0);
        assert.equal(await dialog.locator('[data-reader-link]').count(), 6);
        await page.waitForFunction(() => document.querySelector('.detail-cover')?.naturalWidth > 0);
        assert.equal(await dialog.locator('.detail-cover').evaluate(img => img.naturalWidth), 960);
        assert.ok((await dialog.innerText()).includes('开源项目'));
        const fit = await dialog.evaluate(el => ({ width: el.getBoundingClientRect().width, overflow: el.scrollWidth > el.clientWidth + 1 }));
        assert.ok(fit.width <= width);
        assert.equal(fit.overflow, false);
        await page.screenshot({ path: path.join(out, `reader-${theme}-${width}.png`) });
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(await page.evaluate(() => document.activeElement.id), 'open-project');
        assert.equal((await page.evaluate(() => window.__galleryDebug())).paused, false);
      }
      await page.locator('#open-project').click();
      await page.getByRole('button', { name: '浏览项目目录', exact: true }).click();
      await page.waitForFunction(() => window.__galleryDebug().view === 'list' && document.activeElement.id === 'project-search');
      assert.equal(await page.locator('.project-card').count(), 10);
      assert.equal((await page.evaluate(() => window.__galleryDebug())).paused, true);
      await page.locator('#project-search').fill('板块介绍');
      assert.equal(await page.locator('.project-card').count(), 1);
      await page.locator('.project-card').click();
      assert.equal(await page.locator('#detail-title').innerText(), title);
      await page.getByRole('button', { name: '浏览项目目录', exact: true }).click();
      await page.waitForFunction(() => document.activeElement.id === 'project-search');
      assert.equal(await page.locator('#project-search').inputValue(), '');
      assert.equal(await page.locator('.project-card').count(), 10);
      await page.locator('#project-search').fill('Qwen');
      await page.locator('.project-card').click();
      assert.equal(await page.locator('#detail-title').innerText(), 'Qwen-Image');
      assert.equal(await page.locator('#detail-demo, #detail-source').count(), 2);
      assert.match(await page.locator('.reader-toolbar-title').innerText(), /PROJECT FILE/);
      await page.locator('#reader-back').click();
      await page.waitForFunction(() => !document.querySelector('#project-dialog').open);
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, []);
      assert.deepEqual(badAssets, []);
      console.log(`PASS ${width}: first introduction, both themes, reader, search, directory action and original projects`);
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.startsWith('webgl') ? null : original.call(this, type, ...args);
      };
    });
    await page.goto(`${base}/projects/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#app.list-mode').waitFor();
    await page.locator('[data-detail="project-guide"]').click();
    assert.equal(await page.locator('#detail-title').innerText(), title);
    await page.getByRole('button', { name: '浏览项目目录', exact: true }).click();
    await page.waitForFunction(() => document.activeElement.id === 'project-search');
    assert.equal(await page.locator('.project-card').count(), 10);
    await context.close();
    console.log('PASS introduction remains accessible without WebGL');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
