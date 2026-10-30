const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:5198';
async function openConsole(page, width) {
  if (width < 768) await page.getByRole('button', { name: '打开导航菜单', exact: true }).click();
  await page.getByRole('button', { name: '控制台', exact: true }).click();
  await page.getByRole('dialog').waitFor();
}
const current = (page) => page.locator('.site-console-layer').getAttribute('data-console-theme');

(async () => {
  const { CONSOLE_THEME_STORAGE } = await import(pathToFileURL(path.resolve(__dirname, '../main/src/components/site-console/consoleThemes.js')));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [1366, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/api/**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.setItem('taozhiyy.console-theme.preview', 'paper'));
      assert.equal(await page.locator('.site-console-layer').count(), 0);
      const expected = ['arcade', 'night', 'paper', 'titanium', 'arcade', 'night', 'paper', 'titanium'];
      for (const [index, theme] of expected.entries()) {
        await openConsole(page, width);
        assert.equal(await current(page), theme, `open ${index + 1} at ${width}`);
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), CONSOLE_THEME_STORAGE), theme);
        if (index % 3 === 0) await page.getByRole('button', { name: '关闭控制台', exact: true }).click();
        else if (index % 3 === 1) await page.keyboard.press('Escape');
        else await page.getByRole('button', { name: '收起', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'detached' });
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openConsole(page, width);
      assert.equal(await current(page), 'arcade', 'rotation continues after reload');
      await page.getByRole('button', { name: '主题预览', exact: true }).click();
      await page.getByRole('group', { name: '控制台主题', exact: true }).getByRole('button', { name: '晴笺', exact: true }).click();
      assert.equal(await current(page), 'paper');
      await page.getByRole('button', { name: '收起', exact: true }).click();
      await openConsole(page, width);
      assert.equal(await current(page), 'titanium', 'manual choice advances on next open');
      await page.goto(`${base}/?console=open&consoleTheme=night`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('dialog').waitFor();
      assert.equal(await current(page), 'night', 'explicit preview applies once');
      assert.equal(new URL(page.url()).searchParams.has('consoleTheme'), false);
      await page.getByRole('button', { name: '收起', exact: true }).click();
      await openConsole(page, width);
      assert.equal(await current(page), 'paper', 'preview parameter cannot pin later opens');
      assert.equal(errors.length, 0, errors.join('\n'));
      await context.close();
      console.log(`PASS ${width}: first Arcade, 8 opens, reload continuity, manual choice, one-shot preview`);
    }
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } }));
    const page = await context.newPage();
    await page.route('**/api/**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await openConsole(page, 1366);
    assert.equal(await current(page), 'arcade');
    await page.getByRole('button', { name: '收起', exact: true }).click();
    await openConsole(page, 1366);
    assert.equal(await current(page), 'night');
    console.log('PASS storage blocked: in-memory rotation still works');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
