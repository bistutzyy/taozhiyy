const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:5198';
const out = path.resolve(__dirname, '../previews/project-gallery/.qa/home-console/themes');
fs.mkdirSync(out, { recursive: true });
const themes = [['night', '夜航'], ['paper', '晴笺'], ['titanium', '银钛'], ['arcade', '游艺']];
const sizes = process.env.CONSOLE_QA_CONTRAST_ONLY ? [[1366, 768]] : [[1366, 768], [1024, 600], [768, 1024], [390, 844], [320, 568], [390, 500], [844, 390]];

function luminance(color) {
  const values = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
    const s = v / 255;
    return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
  });
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const looks = new Set();
  const contrastFailures = [];
  try {
    for (const [theme, label] of themes) {
      for (const [width, height] of sizes) {
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.route('**/api/**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
        await page.goto(`${base}/?console=open&consoleTheme=${theme}`, { waitUntil: 'domcontentloaded' });
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        assert.equal(await page.locator('.site-console-layer').getAttribute('data-console-theme'), theme);
        const result = await dialog.evaluate((node) => {
          const r = node.getBoundingClientRect();
          const main = node.querySelector('.console-main').getBoundingClientRect();
          const workspace = node.querySelector('.console-workspace');
          const clipped = [...node.querySelectorAll('.console-main a')].filter((item) => {
            const b = item.getBoundingClientRect();
            return b.top < main.top - 1 || b.bottom > main.bottom + 1 || b.left < main.left - 1 || b.right > main.right + 1 || item.scrollWidth > item.clientWidth + 1;
          }).map((item) => item.getAttribute('aria-label') || item.textContent.trim());
          const smallText = ['.console-journal-entry p', '.console-fragment p', '.console-fragment-english'].map((selector) => getComputedStyle(node.querySelector(selector)).color);
          const style = getComputedStyle(node);
          const number = getComputedStyle(node.querySelector('.console-number-key'));
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const rgba = (value) => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = value;
            ctx.fillRect(0, 0, 1, 1);
            return [...ctx.getImageData(0, 0, 1, 1).data];
          };
          const readControl = (element) => {
            const s = getComputedStyle(element);
            return { label: element.getAttribute('aria-label'), fg: rgba(s.color), bg: rgba(s.backgroundColor) };
          };
          const controlColors = [...node.querySelectorAll('.console-enter-key, .console-tool-key')].map(readControl);
          const music = node.querySelector('[aria-label="音乐"]');
          const originalClass = music.className;
          music.classList.add('is-on');
          controlColors.push(readControl(music));
          music.className = originalClass;
          return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, overflowY: workspace.scrollHeight - workspace.clientHeight, overflowX: workspace.scrollWidth - workspace.clientWidth, clipped, smallText, bg: style.backgroundColor, panelRgb: rgba(style.backgroundColor), controlColors, look: [style.borderRadius, number.fontFamily, number.boxShadow, number.backgroundImage].join('|') };
        });
        assert.ok(Math.abs(result.x - width / 2) <= 1 && Math.abs(result.y - height / 2) <= 1, `${theme} centering`);
        assert.ok(result.overflowX <= 1 && result.overflowY <= 1, `${theme} overflow ${width}x${height}: ${JSON.stringify(result)}`);
        assert.deepEqual(result.clipped, [], `${theme} clipped controls ${width}x${height}`);
        if (width === 1366) {
          looks.add(result.look);
          for (const fg of result.smallText) {
            const a = luminance(fg), b = luminance(result.bg);
            const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
            assert.ok(ratio >= 4.5, `${theme} small text contrast ${ratio.toFixed(2)}: ${fg}`);
          }
          for (const control of result.controlColors) {
            const bg = control.bg.slice(0, 3).map((value, index) => value * control.bg[3] / 255 + result.panelRgb[index] * (1 - control.bg[3] / 255));
            const a = luminance(`rgb(${control.fg.slice(0, 3).join(',')})`), b = luminance(`rgb(${bg.join(',')})`);
            const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
            if (ratio < 4.5) contrastFailures.push(`${theme} ${control.label}: ${ratio.toFixed(2)}`);
          }
        }
        if ([1366, 390].includes(width) && height !== 500) await page.screenshot({ path: path.join(out, `${theme}-${width}.png`) });
        await dialog.getByRole('button', { name: '主题预览', exact: true }).click();
        const picker = dialog.getByRole('group', { name: '控制台主题', exact: true });
        const box = await picker.boundingBox();
        assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, `${theme} theme picker outside viewport`);
        assert.equal(await picker.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true');
        if (width === 390 && height === 844) await page.screenshot({ path: path.join(out, `${theme}-picker.png`) });
        await page.keyboard.press('Escape');
        await picker.waitFor({ state: 'detached' });
        assert.ok(await dialog.isVisible());
        if (width === 1366) {
          await dialog.getByRole('button', { name: '主题预览', exact: true }).click();
          await picker.getByRole('button', { name: '游艺', exact: true }).focus();
          await page.keyboard.press('Tab');
          await picker.waitFor({ state: 'detached' });
          assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '分享');
          assert.ok(await dialog.isVisible());
        }
        assert.equal(errors.length, 0, errors.join('\n'));
        await context.close();
        console.log(`PASS ${theme} ${width}x${height}`);
      }
    }
    assert.ok(looks.size >= 3, 'themes must vary material and typography as well as colors');
    assert.deepEqual(contrastFailures, [], 'small control labels need 4.5:1 contrast');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
