import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaults, validate, LIMITS, recommendedProfile, profileLimits, formatMultiplier } from '../dist/core.mjs';
import { makeMap, connectivity } from '../dist/map.mjs';

const base = JSON.parse(fs.readFileSync(new URL('../dist/assets/farm.json', import.meta.url)));

test('custom dimensions use an area budget and retain the original minimum', () => {
  for (const [w, h] of [[80, 65], [201, 301], [320, 260], [512, 512], [1024, 256], [4032, 65], [80, 3276]]) {
    assert.deepEqual(validate(defaults(w, h)), [], `${w} × ${h}`);
  }
  for (const [w, h] of [[79, 65], [80, 64], [80.5, 65], [Infinity, 65], [80, NaN]]) assert.ok(validate(defaults(w, h)).length);
  assert.ok(validate(defaults(2048, 2049)).some(e => e.includes('总面积')));
  assert.ok(validate(defaults(LIMITS.width + 1, 65)).length);
  assert.ok(validate(defaults(80, LIMITS.height + 1)).length);
});

test('square, very wide and very tall maps at the budget keep connected landmarks', () => {
  for (const [w, h] of [[512, 512], [4032, 65], [80, 3276]]) {
    const c = defaults(w, h), map = makeMap(base, c);
    assert.equal(map.width, w);
    assert.equal(map.height, h);
    assert.equal(map.properties.BusStopEntry, `${w - 1} 17`);
    assert.equal(map.properties.ForestEntry, `41 ${h - 1}`);
    assert.deepEqual(connectivity(map, c), [], `${w} × ${h}`);
  }
});

test('memory recommendations have a conservative fallback and bounded overrides', () => {
 assert.equal(recommendedProfile(undefined),'light');
 assert.equal(recommendedProfile(2),'light');
 assert.equal(recommendedProfile(4),'balanced');
 assert.equal(recommendedProfile(8),'high');
 for(const id of ['light','balanced','high']){
  const p=profileLimits(id);
  assert.ok(p.area<=LIMITS.area);
  assert.ok(p.width*65<=p.area);
  assert.ok(p.height*80<=p.area);
 }
 assert.equal(profileLimits('high').area,2048*2048);
 assert.equal(formatMultiplier(80,65),'1');
 assert.equal(formatMultiplier(160,130),'4');
 assert.equal(formatMultiplier(320,260),'16');
 assert.equal(formatMultiplier(2048,2048),'806.6');
});
