import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaults, validate, LIMITS, formatMultiplier } from '../dist/core.mjs';
import { makeMap, connectivity } from '../dist/map.mjs';

const base = JSON.parse(fs.readFileSync(new URL('../dist/assets/farm.json', import.meta.url)));

test('each side is capped at 4096 and the original minimum stays', () => {
  assert.equal(LIMITS.area, 4096 * 4096);
  assert.equal(LIMITS.width, 4096);
  assert.equal(LIMITS.height, 4096);
  for (const [w, h] of [[80, 65], [201, 301], [320, 260], [512, 512], [1024, 256], [4032, 65], [80, 3276], [2048, 2048], [4096, 4096]]) {
    assert.deepEqual(validate(defaults(w, h)), [], `${w} × ${h}`);
  }
  for (const [w, h] of [[79, 65], [80, 64], [80.5, 65], [Infinity, 65], [80, NaN]]) assert.ok(validate(defaults(w, h)).length);
  assert.ok(validate(defaults(4096, 4097)).some(e => e.includes('高度')));
  assert.ok(validate(defaults(4097, 4096)).some(e => e.includes('宽度')));
  assert.ok(validate(defaults(5000, 130)).length, 'a long side is capped even when the area fits');
  assert.ok(validate(defaults(LIMITS.width + 1, 65)).length);
  assert.ok(validate(defaults(80, LIMITS.height + 1)).length);
});

test('square, very wide and very tall maps keep connected landmarks', () => {
  for (const [w, h] of [[512, 512], [4032, 65], [80, 3276], [3000, 100]]) {
    const c = defaults(w, h), map = makeMap(base, c);
    assert.equal(map.width, w);
    assert.equal(map.height, h);
    assert.equal(map.properties.BusStopEntry, `${w - 1} 17`);
    assert.equal(map.properties.ForestEntry, `41 ${h - 1}`);
    assert.deepEqual(connectivity(map, c), [], `${w} × ${h}`);
  }
});

test('the Farm x N multiplier formats cleanly', () => {
  assert.equal(formatMultiplier(80, 65), '1');
  assert.equal(formatMultiplier(160, 130), '4');
  assert.equal(formatMultiplier(320, 260), '16');
  assert.equal(formatMultiplier(2048, 2048), '806.6');
  assert.equal(formatMultiplier(4096, 4096), '3,226.39');
});
