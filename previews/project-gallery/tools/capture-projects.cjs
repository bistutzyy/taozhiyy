const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');

const targets = [
  ['ruic', 'https://raw.githubusercontent.com/HRuiCcc/RuiC-card-skill/main/assets/demo-after.mp4', 'video'],
  ['shotcraft', 'https://vincentwei1021.github.io/video-shotcraft/'],
  ['reactbits', 'https://reactbits.dev/backgrounds/galaxy'],
  ['gsap', 'https://gsap.com/'],
  ['emil', 'https://github.com/emilkowalski/skills', 'readme'],
  ['qwen', 'https://huggingface.co/Qwen/Qwen-Image'],
  ['designmd', 'https://github.com/VoltAgent/awesome-design-md', 'readme'],
  ['drawio', 'https://next-ai-drawio.jiang.jp/'],
];
(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true, args:['--enable-unsafe-swiftshader']});
  try {
    const requested = process.argv.slice(2);
    for (const [id, url, kind] of targets.filter(([id]) => !requested.length || requested.includes(id))) {
      const page = await browser.newPage({viewport:{width:1280,height:800}, ignoreHTTPSErrors:true});
      try {
        if (kind === 'video') await page.setContent(`<body style="margin:0;background:#08090e;display:grid;place-items:center;height:100vh"><video controls muted preload="auto" src="${url}" style="width:100%;height:100%;object-fit:contain"></video></body>`);
        else await page.goto(url, {waitUntil:'domcontentloaded',timeout:45000});
        await page.waitForTimeout(4500);
        if (kind === 'readme') await page.locator('article.markdown-body').scrollIntoViewIfNeeded();
        if (kind === 'video') {
          await page.locator('video').evaluate(async video => {
            video.muted = true; video.currentTime = 2;
            await new Promise(resolve => {video.addEventListener('seeked', resolve, {once:true}); setTimeout(resolve,3000);});
            video.pause();
          });
        }
        const bytes = kind === 'video' ? await page.locator('video').screenshot() : await page.screenshot();
        await sharp(bytes).resize(960,600,{fit:'cover'}).webp({quality:85}).toFile(path.resolve(__dirname,`../public/covers/${id}.webp`));
        console.log(JSON.stringify({id,url:page.url(),title:await page.title()}));
      } catch (e) { console.error(id+': '+e.message); process.exitCode=1; }
      finally {await page.close();}
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
