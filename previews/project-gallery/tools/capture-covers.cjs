const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');

const targets = [
  ['taozhiyy', 'https://taozhiyy.top/'],
  ['chronicle', 'https://taozhiyy.top/build/'],
  ['glimmer', 'https://taozhiyy.top/glimmer'],
  ['magic', 'https://magic-portfolio-demo.vercel.app/'],
  ['fiber', 'https://pmndrs.github.io/examples/image-gallery/'],
  ['starlight', 'https://starlight.astro.build/'],
];

(async () => {
  const output = path.resolve(__dirname, '../public/covers');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
  for (const [id, url] of targets) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4500);
      const bytes = await page.screenshot();
      await sharp(bytes).resize(960, 600).webp({ quality: 82 }).toFile(path.join(output, `${id}.webp`));
      console.log(JSON.stringify({ id, url: page.url(), title: await page.title(), bytes: (await fs.stat(path.join(output, `${id}.webp`))).size }));
    } catch (e) {
      console.error(id + ': ' + e.message);
      process.exitCode = 1;
    } finally { await page.close(); }
  }
  await browser.close();
})();
