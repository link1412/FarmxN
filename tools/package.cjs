const fs=require('node:fs');
(async()=>{
const {defaults}=await import('../dist/core.mjs');const {packageFiles,zip}=await import('../dist/export.mjs');
const files=packageFiles(JSON.parse(fs.readFileSync('dist/assets/farm.json')),defaults());
for(const [name,data]of Object.entries(files)){const p='release-v2/'+name;fs.mkdirSync(require('node:path').dirname(p),{recursive:true});fs.writeFileSync(p,data);}
fs.writeFileSync('dist/Farm-N-Map.zip',zip(files));console.log('Created dist/Farm-N-Map.zip (Content Patcher + Farm.tmx + layout.json).');
})();
