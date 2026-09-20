import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { zip } from '../dist/export.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const farm = JSON.parse(await fs.readFile(path.join(root, 'dist/assets/farm.json')));
const buildable = JSON.parse(await fs.readFile(path.join(root, 'dist/assets/buildable.json')));
const names = new Set([...farm.sheets.map(s => path.basename(s.image)), 'Greenhouse', 'houses', 'Shipping Bin', 'Pet Bowl']);
const images = Object.fromEntries(await Promise.all([...names].map(async name => [name, 'data:image/png;base64,' + (await fs.readFile(path.join(root, 'dist/assets', name + '.png'))).toString('base64')])));
const assets = JSON.stringify({ farm, buildable, images }).replace(/</g, '\\u003c');
const result = await build({ entryPoints: [path.join(root, 'dist/app.mjs')], bundle: true, write: false, format: 'esm', target: 'es2022', minify: true });
const javascript = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await fs.readFile(path.join(root, 'dist/style.css'), 'utf8');
let html = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]+>/, () => `<style>${css}</style>`).replace(/<script type="module" src="app\.mjs[^>]*><\/script>/, () => `<script type="application/json" id="farm-assets">${assets}</script><script type="module">${javascript}</script>`);
const output = path.join(root, 'site');
await fs.mkdir(path.join(output, 'downloads'), { recursive: true });
await fs.writeFile(path.join(output, 'index.html'), html);
await fs.writeFile(path.join(output, '.nojekyll'), '');
await fs.writeFile(path.join(root, 'downloads/FarmxN-Editor.html'), html);
await fs.writeFile(path.join(root, 'downloads/FarmxN-Editor.zip'), zip({
  'FarmxN/index.html': html,
  'FarmxN/README.txt': 'FarmxN — Offline Editor\n\nOpen index.html in a modern browser. Images and map data are embedded; no server, Node.js or game installation is required to edit.\nExport Farm.tmx and load it using SMAPI + Content Patcher with your own Stardew Valley installation.\nThe default 160 x 130 content pack is a separate download.\nThis is a pre-release; full in-game testing is pending.\n',
  'FarmxN/LICENSE.txt': await fs.readFile(path.join(root, 'LICENSE'), 'utf8'),
}));

for (const file of ['FarmxN-160x130.zip', 'Farm.tmx', 'FarmxN-Editor.html', 'FarmxN-Editor.zip']) await fs.copyFile(path.join(root, 'downloads', file), path.join(output, 'downloads', file));
console.log(`Built standalone site/index.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB). Images and map data are embedded.`);
