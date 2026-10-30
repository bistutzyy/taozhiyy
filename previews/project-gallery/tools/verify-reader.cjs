const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const sharp = require('sharp');
const base = process.argv[2] || 'http://127.0.0.1:5201';
const out = path.resolve('.qa/reader');

async function fitReader(page, width, height) {
  const result = await page.locator('#project-dialog').evaluate(dialog => {
    const rect = dialog.getBoundingClientRect();
    const clipped = [...dialog.querySelectorAll('.detail-toolbar button,.detail-toolbar a,.reader-lead .detail-links a')].filter(node => {
      const box = node.getBoundingClientRect();
      return box.width && (box.left < -1 || box.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1);
    }).map(node => node.textContent.trim() || node.title);
    return {x:rect.x,y:rect.y,w:rect.width,h:rect.height,overflow:dialog.scrollWidth>dialog.clientWidth+1,clipped};
  });
  assert.ok(Math.abs(result.x)<1 && Math.abs(result.y)<1 && Math.abs(result.w-width)<1 && Math.abs(result.h-height)<1, JSON.stringify(result));
  assert.equal(result.overflow, false, `reader overflow at ${width}`);
  assert.deepEqual(result.clipped, [], `clipped reader controls at ${width}`);
}

(async () => {
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
  try {
    const sizes = process.env.READER_QA_SHORT_ONLY ? [[844,390],[667,375]] : [[1440,900],[768,1024],[390,844],[320,740],[844,390],[667,375]];
    for (const [width,height] of sizes) {
      const context = await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__galleryDebug?.().loaded >= (innerWidth<650?4:7));
      const footer = await page.locator('.exhibit-footer').boundingBox();
      const summary = await page.locator('.exhibit-selection').boundingBox();
      assert.ok(footer.y+footer.height<=height+1,'project dock must remain visible');
      assert.ok(summary.y+summary.height<=footer.y+1,'summary and project dock must not overlap');
      const galleryThemes = page.getByRole('group',{name:'奇想馆主题',exact:true});
      const readerThemes = page.getByRole('group',{name:'阅读主题',exact:true});
      assert.equal(await page.locator('.home-link').getAttribute('href'),'https://taozhiyy.top/');
      assert.equal(await page.locator('.home-link').getAttribute('target'),null);
      await page.locator('#gallery-canvas').focus();
      await page.keyboard.press('End');
      await page.waitForFunction(()=>Math.abs(window.__galleryDebug().position-window.__galleryDebug().maxPosition)<.002);
      for (const theme of ['silver','cosmos']) {
        await page.waitForTimeout(1500);
        const before = await page.evaluate(()=>window.__galleryDebug());
        await galleryThemes.locator(`[data-theme-choice="${theme}"]`).click();
        await page.waitForTimeout(350);
        const themed = await page.evaluate(()=>window.__galleryDebug());
        assert.equal(themed.theme, theme);
        assert.equal(themed.selected,before.selected);
        assert.equal(themed.position,before.position);
        assert.equal(themed.createdPanels,before.createdPanels,'theme must reuse project nodes');
        assert.ok(themed.retainedProjects<=themed.cacheLimit);
        await page.waitForTimeout(300);
        assert.ok((await page.evaluate(()=>window.__galleryDebug())).frameCount-themed.frameCount<3,'both themes must stop rendering while idle');
        const image = await page.locator('#gallery-canvas').screenshot();
        const stats = await sharp(image).stats();
        assert.ok(stats.channels[0].stdev>5,'3D canvas must not be blank');
        await page.screenshot({path:path.join(out,`${theme}-scene-${width}.png`)});
        const firstPoint = themed.projected[0];
        await page.locator('#gallery-canvas').focus();
        await page.keyboard.press('Home');
        await page.waitForFunction(()=>window.__galleryDebug().position<.002);
        const moved = await page.evaluate(()=>window.__galleryDebug());
        assert.notDeepEqual(moved.camera,themed.camera,'canvas must move in both themes');
        assert.ok(firstPoint);
        await page.locator('[data-project="ruic"]').click();
        await page.locator('#open-project').click();
        await fitReader(page,width,height);
        assert.equal(await page.locator('#reader-back').innerText(),'返回星空');
        assert.equal(await page.locator('#project-dialog iframe').count(),0);
        assert.equal(await page.locator('video').getAttribute('preload'),'none');
        const paused = await page.evaluate(()=>window.__galleryDebug());
        assert.equal(paused.paused,true);
        await page.waitForTimeout(200);
        assert.equal((await page.evaluate(()=>window.__galleryDebug())).frameCount,paused.frameCount,'reader must pause rendering');
        const alternate = theme === 'silver' ? 'cosmos' : 'silver';
        await readerThemes.locator(`[data-theme-choice="${alternate}"]`).click();
        assert.equal((await page.evaluate(()=>window.__galleryDebug())).theme,alternate);
        assert.equal((await page.evaluate(()=>window.__galleryDebug())).paused,true);
        await readerThemes.locator(`[data-theme-choice="${theme}"]`).click();
        await page.locator('.detail-cover').waitFor();
        await page.waitForFunction(()=>document.querySelector('.detail-cover').complete && document.querySelector('.detail-cover').naturalWidth>0);
        await page.screenshot({path:path.join(out,`${theme}-reader-${width}.png`)});
        if (width <= 700) {
          await page.locator('#reader-section-select').selectOption('detail-source');
        } else {
          await page.locator('#project-dialog').evaluate(dialog=>{dialog.scrollTop=dialog.querySelector('.detail-body').offsetTop});
          const index = await page.locator('.detail-toc').boundingBox();
          assert.ok(index.y+index.height<=height+1,'sticky reader index must fit in viewport');
          await page.locator('[data-reader-link][href="#detail-source"]').click();
        }
        await page.waitForFunction(()=>document.querySelector('#project-dialog').scrollTop>200);
        const source = await page.locator('#detail-source').boundingBox();
        assert.ok(source.y>=0 && source.y<height,'section navigation must reveal target');
        await page.locator('#reader-back').click();
        await page.waitForFunction(()=>!document.querySelector('#project-dialog').open && !window.__galleryDebug().paused);
        const closed = await page.evaluate(()=>window.__galleryDebug());
        assert.equal(closed.selected,paused.selected);
        assert.equal(closed.position,paused.position);
        assert.ok(closed.camera.every((value,index)=>Math.abs(value-paused.camera[index])<1e-7));
        assert.equal(closed.paused,false);
        assert.equal(await page.evaluate(()=>document.activeElement.id),'open-project');
        await page.locator('#gallery-canvas').focus();
        await page.keyboard.press('End');
        await page.waitForFunction(()=>Math.abs(window.__galleryDebug().position-window.__galleryDebug().maxPosition)<.002);
      }
      await page.locator('#list-view').click();
      await page.locator('#project-search').fill('GSAP');
      await page.locator('.project-card').click();
      assert.equal(await page.locator('#reader-back').innerText(),'返回目录');
      await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.__copied=value}},configurable:true}));
      await page.locator('[data-copy-section]').first().click();
      assert.ok((await page.evaluate(()=>window.__copied)).includes('npx skills add'));
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#project-search').inputValue(),'GSAP');
      assert.equal(await page.locator('.project-card').count(),1);
      await page.locator('#project-search').fill('');
      const lastCard = page.locator('.project-card').last();
      await lastCard.scrollIntoViewIfNeeded();
      const listScroll = await page.locator('#catalogue').evaluate(node=>node.scrollTop);
      await lastCard.click();
      await page.locator('#reader-back').click();
      assert.equal(await page.locator('#catalogue').evaluate(node=>node.scrollTop),listScroll,'returning preserves catalogue scroll');
      await galleryThemes.locator('[data-theme-choice="silver"]').click();
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__galleryDebug?.().theme==='silver');
      assert.equal(await page.locator('html').getAttribute('data-gallery-theme'),'silver');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}x${height}: both scenes, full-screen reader, navigation, state, media, copy and theme persistence`);
      await context.close();
    }
    const blocked = await browser.newContext();
    await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}));
    const page = await blocked.newPage();
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__galleryDebug);
    await page.locator('.site-header [data-theme-choice="silver"]').click();
    assert.equal((await page.evaluate(()=>window.__galleryDebug())).theme,'silver');
    await blocked.close();
    console.log('PASS blocked storage: theme controls remain usable');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
