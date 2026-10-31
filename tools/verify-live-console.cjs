const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:5200';
const out = path.resolve(__dirname, '../previews/project-gallery/.qa/home-console/release');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [1366, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.route('**/api/**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      for (const theme of ['arcade', 'night', 'paper', 'titanium']) {
        if (width < 768) await page.getByRole('button', { name: '打开导航菜单', exact: true }).click();
        await page.getByRole('button', { name: '控制台', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        assert.equal(await page.locator('.site-console-layer').getAttribute('data-console-theme'), theme);
        const feed = dialog.getByRole('log', { name: '更新日志', exact: true });
        assert.equal(await feed.locator('article').count(), 7);
        assert.ok((await feed.locator('article').first().innerText()).includes('首页扇面画屏'));
        assert.ok((await feed.innerText()).includes('2026-10-31'));
        assert.equal(await feed.locator('article').first().getByRole('link').getAttribute('href'), '/build/post/site-growth-19-folding-fan-covers');
        assert.equal(await dialog.getByRole('link', { name: '进入奇想馆', exact: true }).getAttribute('href'), '/projects/');
        assert.equal(await dialog.getByRole('link', { name: '翻开时间轴', exact: true }).getAttribute('href'), '/build/');
        assert.equal(await dialog.getByRole('link', { name: '进入花园', exact: true }).getAttribute('href'), 'https://bistutzyy.github.io/');
        if (theme === 'arcade') await page.screenshot({ path: path.join(out, `console-release-${width}.png`) });
        await dialog.getByRole('button', { name: '收起', exact: true }).click();
        await dialog.waitFor({ state: 'detached' });
      }
      if (width < 768) await page.getByRole('button', { name: '打开导航菜单', exact: true }).click();
      await page.getByRole('button', { name: '控制台', exact: true }).click();
      const feed = page.getByRole('log', { name: '更新日志', exact: true });
      await feed.getByRole('link', { name: '去抽一张', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.waitForURL('**/#end');
      assert.equal(await page.evaluate(() => document.getElementById('root').inert), false);
      console.log(`PASS ${width}: deployed console, 7 concise updates, 4-theme rotation, fragment links and lottery close`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
