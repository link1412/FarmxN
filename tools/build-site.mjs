import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, deflateRawSync } from 'node:zlib';
import { build } from 'esbuild';
import { zip } from '../dist/export.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const farmJSON = await fs.readFile(path.join(root, 'dist/assets/farm.json'));
const farm = JSON.parse(farmJSON);
const names = new Set([...farm.sheets.map(s => path.basename(s.image)), 'Greenhouse', 'houses', 'Shipping Bin', 'Pet Bowl']);
const images = Object.fromEntries(await Promise.all([...names].map(async name => [name, 'data:image/png;base64,' + (await fs.readFile(path.join(root, 'dist/assets', name + '.png'))).toString('base64')])));
const assets = JSON.stringify({ farmGzip: gzipSync(farmJSON, {level:9}).toString('base64'), images }).replace(/</g, '\\u003c');
const bundle = async file => (await build({ entryPoints: [path.join(root, file)], bundle: true, write: false, format: 'esm', target: 'es2022', minify: true })).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const javascript = await bundle('dist/app.mjs');
const worker = await bundle('dist/map-worker.mjs');
const css = await fs.readFile(path.join(root, 'dist/style.css'), 'utf8');
let html = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]+>/, () => `<style>${css}</style>`).replace(/<script type="module" src="app\.mjs[^>]*><\/script>/, () => `<script type="application/json" id="farm-assets">${assets}</script><script type="text/plain" id="farm-worker">${worker}</script><script type="module">${javascript}</script>`);
const output = path.join(root, 'site');
await fs.mkdir(path.join(output, 'downloads'), { recursive: true });
await fs.rm(path.join(output, 'assets'), {recursive:true,force:true});
await fs.writeFile(path.join(output, 'index.html'), html);
await fs.writeFile(path.join(output, '.nojekyll'), '');
await fs.writeFile(path.join(root, 'downloads/FarmxN-Editor.html'), html);
await fs.writeFile(path.join(root, 'downloads/FarmxN-Editor.zip'), zip({
  'FarmxN/index.html': html,
  'FarmxN/README.txt': 'Farm x N — Editor\n\nThe online and offline editor use exactly the same HTML file. Open index.html in a modern browser. Images, compressed map data and the background worker are embedded; no server, Node.js or game installation is required to edit.\nExport Farm.tmx and load it using SMAPI + Content Patcher with your own Stardew Valley installation.\nThe default 2048 x 2048 content pack is a separate download.\nFor fun and creative play: back up your saves and start a NEW standard farm.\n',
  'FarmxN/LICENSE.txt': await fs.readFile(path.join(root, 'LICENSE'), 'utf8'),
}, data => deflateRawSync(data, {level:9})));
for (const file of ['FarmxN-2048x2048.zip', 'Farm.tmx', 'FarmxN-Editor.html', 'FarmxN-Editor.zip']) await fs.copyFile(path.join(root, 'downloads', file), path.join(output, 'downloads', file));
console.log(`Built identical online/offline HTML (${(Buffer.byteLength(html)/1024).toFixed(1)} KiB); base map compressed to ${(gzipSync(farmJSON,{level:9}).length/1024).toFixed(1)} KiB.`);
