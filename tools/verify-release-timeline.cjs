const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = (process.argv[2] || 'http://127.0.0.1:5199').replace(/\/$/, '');
const out = path.resolve(__dirname, '../previews/project-gallery/.qa/home-console/release');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [1366, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/api/**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
      await page.goto(`${base}/build/`, { waitUntil: 'domcontentloaded' });
      await page.locator('.chronicle-record').first().waitFor();
      assert.equal(await page.locator('.chronicle-record').count(), 19);
      assert.equal(await page.locator('.chronicle-record').first().getAttribute('id'), 'site-growth-19-folding-fan-covers');
      assert.equal(await page.locator('.chronicle-record').nth(1).getAttribute('id'), 'site-growth-18-home-console');
      await page.getByRole('searchbox').fill('扇面画屏');
      assert.equal(await page.locator('.chronicle-record').count(), 1);
      await page.screenshot({ path: path.join(out, `timeline-${width}.png`) });
      await page.locator('.chronicle-record h2 a').click();
      await page.waitForURL('**/post/site-growth-19-folding-fan-covers');
      await page.locator('.post-body').waitFor();
      assert.ok((await page.locator('.post-body').innerText()).includes('花瓣'));
      await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
      assert.ok((await page.locator('.post-body').innerText()).includes('folding fan'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('.post-body').waitFor();
      assert.ok((await page.locator('.post-body').innerText()).includes('folding fan'));
      await page.goto(`${base}/build/post/site-growth-17-project-cosmos`, { waitUntil: 'domcontentloaded' });
      await page.locator('.post-body').waitFor();
      assert.ok((await page.locator('.post-body').innerText()).includes('taozhiyo'));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, 'article must not overflow horizontally');
      assert.equal(errors.length, 0, errors.join('\n'));
      console.log(`PASS ${width}: 19 records, newest order, search, bilingual articles and direct routes`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
