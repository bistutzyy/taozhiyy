const {chromium}=require('playwright');
const sharp=require('sharp');
const fs=require('node:fs');
const name=process.argv[2]||'profile';
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1.5});
    await page.goto('http://127.0.0.1:5196');
    await page.waitForFunction(()=>window.__galleryDebug?.().loaded>=7);
    await page.waitForTimeout(1800);
    await page.screenshot({path:`.qa/${name}.png`});
    const raw=await sharp(`.qa/${name}.png`).extract({left:700,top:140,width:700,height:200}).removeAlpha().raw().toBuffer();
    let bright=0,total=0;
    for(let i=0;i<raw.length;i+=3){const l=(raw[i]+raw[i+1]+raw[i+2])/3;total+=l;if(l>90)bright++;}
    await page.evaluate(()=>{
      window.__profile={frames:[],longTasks:[],mutations:0,previous:performance.now(),running:true};
      const observer=new PerformanceObserver(list=>window.__profile.longTasks.push(...list.getEntries().map(e=>e.duration)));
      observer.observe({type:'longtask',buffered:false});
      new MutationObserver(list=>window.__profile.mutations+=list.length).observe(document.querySelector('#project-dock'),{childList:true,subtree:true});
      function frame(t){if(!window.__profile.running)return;window.__profile.frames.push(t-window.__profile.previous);window.__profile.previous=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
    });
    await page.mouse.move(850,450);
    for(const sign of [1,-1,1,-1])for(let i=0;i<18;i++){await page.mouse.wheel(0,sign*45);await page.waitForTimeout(18);}
    await page.waitForTimeout(800);
    const report=await page.evaluate(()=>{const p=window.__profile;p.running=false;const a=p.frames.slice(2).sort((a,b)=>a-b);return {frames:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],over34ms:a.filter(x=>x>34).length,longTasks:p.longTasks,mutations:p.mutations,debug:window.__galleryDebug()};});
    report.background={brightPixels:bright,meanLuminance:total/(raw.length/3)};
    fs.writeFileSync(`.qa/${name}.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
