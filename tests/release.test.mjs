import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

test('the site is one self-contained HTML file and nothing else is published', () => {
  execFileSync(process.execPath, ['tools/build-site.mjs']);
  const html = fs.readFileSync('site/index.html', 'utf8');
  assert.ok(Buffer.byteLength(html) < 650000, 'single-file editor stays compact');
  assert.match(html, /id="farm-worker"/);
  assert.doesNotMatch(html, /<(?:script|link)\b[^>]+(?:src|href)=["'](?!data:)/i);
  const embedded = html.match(/<script type="application\/json" id="farm-assets">(.*?)<\/script>/s);
  assert.ok(embedded, 'base map and preview assets embedded');
  const assets = JSON.parse(embedded[1]);
  assets.farm = JSON.parse(gunzipSync(Buffer.from(assets.farmGzip, 'base64')));
  assert.deepEqual(assets.farm, JSON.parse(fs.readFileSync('dist/assets/farm.json')));
  assert.equal(assets.farm.width, 80);
  assert.equal(assets.farm.height, 65);
  for (const sheet of assets.farm.sheets) assert.ok(assets.images[sheet.image.split('/').pop()]);
  for (const value of Object.values(assets.images)) {
    assert.ok(value.startsWith('data:image/png;base64,'));
    assert.equal(Buffer.from(value.split(',')[1], 'base64').subarray(1, 4).toString(), 'PNG');
  }
  // No prebuilt maps and no second copy of the editor: visitors generate everything locally.
  assert.deepEqual(fs.readdirSync('site').sort(), ['.nojekyll', 'index.html']);
  assert.ok(!fs.existsSync('downloads'));
  const loader = JSON.parse(fs.readFileSync('templates/[CP] FarmxN/content.json'));
  assert.equal(loader.Changes[0].Target, 'Maps/Farm');
  assert.equal(loader.Changes[0].FromFile, 'assets/Farm.tmx');
});
