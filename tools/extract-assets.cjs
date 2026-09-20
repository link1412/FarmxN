const fs=require('node:fs/promises');
const path=require('node:path');
const {unpackToFiles}=require('xnb');
const root=process.env.STARDEW_CONTENT || require('./game-paths.cjs').gamePaths().content;
(async()=>{
 await fs.mkdir('dist/assets',{recursive:true});
 const assets=['Maps/spring_outdoorTileSheet_extra','Maps/paths','Maps/spring_outdoorsTileSheet','Maps/spring_outdoorsTileSheet2','Buildings/Greenhouse','Buildings/Shipping Bin','Buildings/Pet Bowl','Buildings/houses'];
 for(const name of assets){
  try {const outputs=await unpackToFiles(await fs.readFile(path.join(root,name+'.xnb')),{fileName:path.basename(name)+'.xnb'});
   for(const o of outputs) if(o.extension==='png') {await fs.writeFile('dist/assets/'+path.basename(name)+'.png', o.data instanceof Blob?Buffer.from(await o.data.arrayBuffer()):o.data);console.log(name);}
  } catch(e){console.error(name+': '+e.message);process.exitCode=1;}
 }
})();
