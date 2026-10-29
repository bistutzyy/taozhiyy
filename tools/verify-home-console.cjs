const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:5198';
const out = path.resolve(__dirname, '../previews/project-gallery/.qa/home-console');
fs.mkdirSync(out, { recursive: true });

async function openConsole(page, width) {
  if (width < 768) await page.getByRole('button', { name: '打开导航菜单', exact: true }).click();
  await page.getByRole('button', { name: '控制台', exact: true }).click();
  await page.getByRole('dialog', { name: '控制台.' }).waitFor();
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [width, height] of [[1440, 1000], [1920, 1080], [1024, 768], [768, 1024], [390, 844], [320, 740]]) {
      const context = await browser.newContext({ viewport: { width, height }, permissions: ['clipboard-read', 'clipboard-write'] });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      // UI-only preview has no local backend. Do not send writes to production.
      await page.route('**/api/**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Local UI preview', error: 'PREVIEW_ONLY' }) }));
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await openConsole(page, width);
      const dialog = page.getByRole('dialog');
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.equal(await page.evaluate(() => document.getElementById('root').inert), true);
      assert.equal(await dialog.locator('.console-fragment').count(), 3);
      assert.ok(await dialog.locator('.console-fragment-cover img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)));
      assert.equal(await dialog.getByRole('link', { name: '进入花园', exact: true }).last().getAttribute('href'), 'https://bistutzyy.github.io/');
      assert.equal(await dialog.locator('.console-enter-key').nth(0).getAttribute('href'), 'https://taozhiyy.top/projects/');
      assert.equal(await dialog.locator('.console-enter-key').nth(2).getAttribute('href'), 'https://taozhiyy.top/build/');
      assert.equal(await dialog.getByRole('link', { name: '前往现有抽奖机', exact: true }).getAttribute('href'), '/#end');

      const geometry = await dialog.evaluate((element) => {
        const workspace = element.querySelector('.console-workspace');
        const rect = element.getBoundingClientRect();
        const controls = element.querySelector('.console-control-strip').getBoundingClientRect();
        return { left: rect.left, right: rect.right, bottom: rect.bottom, overflow: workspace.scrollWidth - workspace.clientWidth, controlsBottom: controls.bottom };
      });
      assert.ok(geometry.left >= 0 && geometry.right <= width + 1 && geometry.bottom <= height + 1);
      assert.ok(geometry.overflow <= 1, `horizontal overflow at ${width}: ${geometry.overflow}`);
      assert.ok(geometry.controlsBottom <= height);
      assert.ok(await page.locator('#blog-ai-root').evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).visibility === 'hidden')));
      await page.screenshot({ path: path.join(out, `${width}x${height}.png`) });

      await dialog.getByRole('tab', { name: '更新日志', exact: true }).click();
      await dialog.getByText('星空里的新落款', { exact: true }).waitFor();
      assert.equal(await dialog.getByRole('tab', { name: '更新日志', exact: true }).getAttribute('aria-selected'), 'true');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await dialog.getByRole('tab', { name: '公告', exact: true }).getAttribute('aria-selected'), 'true');
      await dialog.locator('summary').nth(1).click();
      assert.equal(await dialog.locator('details').nth(1).getAttribute('open'), '');

      await dialog.getByRole('button', { name: '分享', exact: true }).click();
      await dialog.getByRole('status').getByText('已复制站点链接', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'https://taozhiyy.top/');

      await dialog.getByRole('button', { name: '关闭控制台', exact: true }).focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.title), '收起控制台');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '关闭控制台');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => document.getElementById('root').inert), false);
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
      await page.waitForTimeout(50);
      assert.equal(await page.evaluate(() => document.activeElement.textContent?.trim() || document.activeElement.getAttribute('aria-label')), width < 768 ? '打开导航菜单' : '控制台');

      await openConsole(page, width);
      await page.mouse.click(2, 2);
      await dialog.waitFor({ state: 'detached' });
      await openConsole(page, width);
      await dialog.getByRole('button', { name: '顶部', exact: true }).click();
      await dialog.waitFor({ state: 'detached' });
      if ([1440, 390].includes(width)) {
        await page.waitForFunction(() => document.getElementById('bg-image')?.complete);
        await openConsole(page, width);
        await dialog.getByRole('button', { name: '音乐', exact: true }).click();
        await page.waitForFunction(() => {
          const audio = document.querySelector('audio');
          return audio && !audio.paused && audio.readyState >= 2;
        }, undefined, { timeout: 15000 });
        assert.equal(await dialog.getByRole('button', { name: '音乐', exact: true }).getAttribute('aria-pressed'), 'true');
        await dialog.getByRole('button', { name: '音乐', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('audio').paused);
        const previousCover = await page.locator('#bg-image').getAttribute('src');
        await dialog.getByRole('button', { name: '换封面', exact: true }).click();
        await dialog.waitFor({ state: 'detached' });
        if (width >= 768) {
          await page.getByRole('button', { name: 'Close hero card selector', exact: true }).waitFor({ state: 'visible' });
          await page.keyboard.press('Escape');
        } else {
          await page.waitForFunction((previous) => document.getElementById('bg-image').getAttribute('src') !== previous, previousCover);
        }
        await page.screenshot({ path: path.join(out, `${width}-homepage.png`) });
        console.log(`PASS ${width}: real music playback and cover switch`);
      }
      assert.equal(errors.length, 0, errors.join('\n'));
      console.log(`PASS ${width}x${height}: images, controls, tabs, links, clipboard, focus, close, layout`);
      await context.close();
    }
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.route('**/api/**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
      await page.goto(`${base}/about`, { waitUntil: 'domcontentloaded' });
      await openConsole(page, width);
      await page.getByRole('tab', { name: '更新日志', exact: true }).click();
      assert.equal(await page.getByRole('link', { name: '去看看', exact: true }).getAttribute('href'), 'https://taozhiyy.top/projects/');
      await page.getByRole('link', { name: '前往现有抽奖机', exact: true }).click();
      await page.waitForURL('**/#end');
      await page.waitForFunction(() => window.scrollY > 1000 && document.getElementById('end')?.getBoundingClientRect().top < window.innerHeight);
      console.log(`PASS ${width}: cross-page lottery anchor and journal actions`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
