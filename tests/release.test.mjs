import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import { execFileSync } from 'node:child_process';

test('standalone HTML embeds every preview dependency and the default pack has a loader', () => {
  execFileSync(process.execPath, ['tools/build-default.mjs']);
  execFileSync(process.execPath, ['tools/build-site.mjs']);
  const html = fs.readFileSync('site/index.html', 'utf8');
  assert.ok(Buffer.byteLength(html) < 650000, 'single-file editor stays compact');
  assert.match(html, /id="farm-worker"/);
  assert.doesNotMatch(html, /<(?:script|link)\b[^>]+(?:src|href)=["'](?!data:)/i);
  const embedded = html.match(/<script type="application\/json" id="farm-assets">(.*?)<\/script>/s);
  assert.ok(embedded, 'base map and preview assets embedded');
  const assets = JSON.parse(embedded[1]);
  assets.farm = JSON.parse(gunzipSync(Buffer.from(assets.farmGzip,'base64')));
  assert.deepEqual(assets.farm,JSON.parse(fs.readFileSync('dist/assets/farm.json')));
  assert.equal(assets.farm.width, 80);
  assert.equal(assets.farm.height, 65);
  for (const sheet of assets.farm.sheets) assert.ok(assets.images[sheet.image.split('/').pop()]);
  for (const value of Object.values(assets.images)) {
    assert.ok(value.startsWith('data:image/png;base64,'));
    assert.equal(Buffer.from(value.split(',')[1], 'base64').subarray(1, 4).toString(), 'PNG');
  }
  const tmx = fs.readFileSync('downloads/Farm.tmx', 'utf8');
  assert.match(tmx, /<map[^>]+width="2048" height="2048"/);
  const loader = JSON.parse(fs.readFileSync('templates/[CP] FarmxN/content.json'));
  assert.equal(loader.Changes[0].Target, 'Maps/Farm');
  assert.equal(loader.Changes[0].FromFile, 'assets/Farm.tmx');
  assert.equal(fs.readFileSync('downloads/FarmxN-Editor.html', 'utf8'), html);
  assert.equal(fs.readFileSync('site/downloads/FarmxN-Editor.html', 'utf8'), html);
});
