const { chromium } = require('playwright');
const sharp = require('sharp');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

const base = process.argv[2] || 'http://127.0.0.1:5211';
assert.equal(new URL(base).hostname, '127.0.0.1', 'QA only targets the local preview');

(async () => {
  const { projects } = await import('../src/catalog.js');
  const entries = projects.filter(p => ['localsend','nature-skills','anti-defensive-writing'].includes(p.id));
  assert.equal(entries.length, 3);
  await fs.mkdir('.qa', { recursive: true });
  for (const entry of entries) {
    for (const [folder, width, height] of [['covers',960,600], ['thumbs',480,300]]) {
      const image = sharp(`public/${folder}/${entry.id}.webp`);
      const meta = await image.metadata();
      assert.equal(meta.width, width);
      assert.equal(meta.height, height);
      const stats = await image.stats();
      assert.ok(stats.channels.some(channel => channel.stdev > 15), `${entry.id} ${folder} is nonblank`);
    }
  }
  const browser = await chromium.launch({channel:'msedge', headless:true, args:['--enable-unsafe-swiftshader']});
  try {
    const fallback = await browser.newContext({javaScriptEnabled:false});
    const staticPage = await fallback.newPage();
    await staticPage.goto(base);
    assert.equal(await staticPage.locator('.collection-count').innerText(), 'PROJECT INDEX / 12 + GUIDE');
    assert.equal(await staticPage.locator('.collection-filters').getAttribute('aria-label'), '12 个项目与板块介绍');
    assert.match(await staticPage.locator('.exhibit-meta strong').innerText(), /01\s*\/\s*13/);
    await fallback.close();
    console.log('PASS static HTML: twelve projects plus guide, thirteen total, without JavaScript');
    for (const [width, height] of [[1440,900], [390,844], [320,740]]) {
      const context = await browser.newContext({viewport:{width,height}, reducedMotion:'reduce'});
      await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await page.waitForFunction(() => document.documentElement.dataset.sceneReady === 'true');
      await page.waitForFunction(() => window.__galleryDebug().loaded > 0);
      assert.match(await page.locator('.collection-count').innerText(), /12 \+ GUIDE/);
      const canvas = await page.locator('#gallery-canvas').screenshot();
      const pixels = await sharp(canvas).stats();
      assert.ok(pixels.channels.some(channel => channel.stdev > 10), 'canvas renders the catalog');
      await page.locator('#gallery-canvas').focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => window.__galleryDebug().projected.some(p => p.id === 'anti-defensive-writing'));
      assert.ok(await page.locator('[data-project="anti-defensive-writing"]').count());
      await page.locator('#list-view').click();
      assert.equal(await page.locator('.project-card').count(), 12);
      assert.equal(await page.locator('#result-count').innerText(), '13 项内容');
      await page.locator('#list-next').click();
      assert.equal(await page.locator('.project-card').count(), 1);
      assert.equal(await page.locator('.project-card').getAttribute('data-detail'), 'anti-defensive-writing');
      for (const entry of entries) {
        await page.locator('#project-search').fill(entry.title);
        assert.equal(await page.locator('.project-card').count(), 1);
        const card = page.locator(`[data-detail="${entry.id}"]`);
        await card.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => [...document.querySelectorAll('.card-cover')].every(image => image.complete && image.naturalWidth === 960));
        await card.click();
        assert.equal(await page.locator('#detail-title').innerText(), entry.title);
        assert.equal(await page.locator('#project-dialog iframe, #project-dialog video, #project-dialog form').count(), 0);
        assert.equal(await page.locator('.detail-section').count(), 7);
        await page.waitForFunction(() => document.querySelector('.detail-cover')?.naturalWidth === 960);
        await page.locator('#project-dialog').screenshot({path:`.qa/additions-reader-${entry.id}-${width}.png`});
        assert.ok(await page.locator('#project-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'reader has no horizontal overflow');
        for (const section of ['#detail-section-4','#detail-demo','#detail-source']) {
          await page.locator(section).scrollIntoViewIfNeeded();
          const bounds = await page.locator(section).boundingBox();
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${entry.id} ${section} fits ${width}px`);
        }
        const link = page.locator('#detail-demo .trial-links a');
        assert.equal(await link.getAttribute('href'), entry.demo.url);
        assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
        assert.match(await page.locator('#detail-source').innerText(), /2026-11-01/);
        await page.locator('#close-dialog').click();
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}x${height}: 13 entries, two directory pages, three searchable readers, covers, canvas, and safe links`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
