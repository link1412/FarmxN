import fs from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import { defaults, formatMultiplier } from '../dist/core.mjs';
import { makeMap, connectivity, toTmx } from '../dist/map.mjs';
import { zip } from '../dist/export.mjs';
const base = JSON.parse(await fs.readFile(new URL('../dist/assets/farm.json', import.meta.url)));
await fs.mkdir(new URL('../downloads/', import.meta.url), { recursive: true });
for (const [width,height] of [[2048,2048]]) {
 const config=defaults(width,height),map=makeMap(base,config),errors=connectivity(map,config);
 if(errors.length)throw Error(errors.join('\n'));
 const root='[CP] FarmxN/',tmx=toTmx(map),files={};
 for(const name of ['manifest.json','content.json'])files[root+name]=await fs.readFile(new URL('../templates/'+root+name,import.meta.url),'utf8');
 files[root+'assets/Farm.tmx']=tmx;
 files[root+'README.txt']=`Farm x N — ${width} x ${height} Standard Farm (Farm x ${formatMultiplier(width,height)})

Requires Stardew Valley 1.6, SMAPI 4 and Content Patcher.
Copy [CP] FarmxN into the game Mods directory. Launch via SMAPI and start a NEW standard farm.
For fun and creative play: back up your saves first.
Install only ONE Farm x N map pack. Do not enable another mod which also replaces Maps/Farm.
Large maps use more memory and may take longer to load. Use the editor to make a smaller map if needed.

${width} × ${height} 标准农场。安装 SMAPI 和 Content Patcher 后，将 [CP] FarmxN 放入 Mods，使用 SMAPI 启动并新建标准农场。
建议娱乐体验，请先备份存档并开新档。只安装一个 Farm x N 地图包，请勿同时启用其他标准农场替换模组。
大地图需要更多内存和加载时间，可用编辑器自行缩小地图。
`;
 await fs.writeFile(new URL(`../downloads/FarmxN-${width}x${height}.zip`,import.meta.url),zip(files,data=>deflateRawSync(data,{level:9})));
 if(width===2048)await fs.writeFile(new URL('../downloads/Farm.tmx',import.meta.url),tmx);
 console.log(`Built FarmxN-${width}x${height}.zip`);
}
