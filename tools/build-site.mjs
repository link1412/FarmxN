import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
// The whole site is one self-contained HTML file: the base map (gzip), preview images and the
// worker are embedded. Nothing else is published; maps are generated in the visitor's browser.
const root = fileURLToPath(new URL('../', import.meta.url));
const farmJSON = await fs.readFile(path.join(root, 'dist/assets/farm.json'));
const farm = JSON.parse(farmJSON);
const names = new Set([...farm.sheets.map(s => path.basename(s.image)), 'Greenhouse', 'houses', 'Shipping Bin', 'Pet Bowl']);
const images = Object.fromEntries(await Promise.all([...names].map(async name => [name, 'data:image/png;base64,' + (await fs.readFile(path.join(root, 'dist/assets', name + '.png'))).toString('base64')])));
const assets = JSON.stringify({ farmGzip: gzipSync(farmJSON, { level: 9 }).toString('base64'), images }).replace(/</g, '\\u003c');
const bundle = async file => (await build({ entryPoints: [path.join(root, file)], bundle: true, write: false, format: 'esm', target: 'es2022', minify: true })).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const javascript = await bundle('dist/app.mjs');
const worker = await bundle('dist/map-worker.mjs');
const css = await fs.readFile(path.join(root, 'dist/style.css'), 'utf8');
let html = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]+>/, () => `<style>${css}</style>`).replace(/<script type="module" src="app\.mjs[^>]*><\/script>/, () => `<script type="application/json" id="farm-assets">${assets}</script><script type="text/plain" id="farm-worker">${worker}</script><script type="module">${javascript}</script>`);
const output = path.join(root, 'site');
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, 'index.html'), html);
await fs.writeFile(path.join(output, '.nojekyll'), '');
console.log(`Built site/index.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB); base map compressed to ${(gzipSync(farmJSON, { level: 9 }).length / 1024).toFixed(1)} KiB.`);
