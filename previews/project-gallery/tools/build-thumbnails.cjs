const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
  const {projects}=await import('../src/catalog.js');
  const output=path.resolve(__dirname,'../public/thumbs');
  await fs.mkdir(output,{recursive:true});
  for(const p of projects) {
    await sharp(path.resolve(__dirname,'../public',p.cover.slice(1)))
      .resize(480,300).webp({quality:82}).toFile(path.join(output,p.id+'.webp'));
  }
  console.log('Built '+projects.length+' small project previews.');
})().catch(e=>{console.error(e);process.exitCode=1;});
