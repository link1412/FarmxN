import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaults, spouseArea, resized, validate } from '../dist/core.mjs';
import { makeMap, layer, connectivity, isPassable } from '../dist/map.mjs';

const base = JSON.parse(fs.readFileSync(new URL('../dist/assets/farm.json', import.meta.url)));
const index = (map, id, x, y) => layer(map, id).tiles[y][x]?.index ?? null;
function sameArea(a, b, r) {
  for (let i = 0; i < a.layers.length; i++) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    assert.deepEqual(a.layers[i].tiles[y][x], b.layers[i].tiles[y][x], `${a.layers[i].id} ${x},${y}`);
  }
}

test('moving the farmhouse leaves the original patio and its surroundings untouched', () => {
  for (const [w, h] of [[80, 65], [160, 130], [200, 300]]) {
    const c = defaults(w, h), before = makeMap(base, c), patio = spouseArea(c);
    c.Positions.Farmhouse = { X: 45, Y: 40 };
    const after = makeMap(base, c);
    assert.equal(after.properties.SpouseAreaLocation, before.properties.SpouseAreaLocation);
    sameArea(after, before, { ...patio, h: 8 });
    // No duplicate yard or tree/fence patch is pasted beside the new house.
    sameArea(after, before, { x: 55, y: 34, w: 4, h: 6 });
    sameArea(after, before, { x: 56, y: 40, w: 3, h: 2 });
    assert.equal(after.properties.FarmHouseEntry, '50 43');
    assert.equal(after.properties.MailboxLocation, '54 44');
    assert.deepEqual(connectivity(after, c), []);
  }
});

test('the fixed spouse area follows map expansion, never the moved farmhouse', () => {
  const c = defaults(); c.Positions.Farmhouse = { X: 100, Y: 70 };
  const larger = resized(c, 200, 260), map = makeMap(base, larger);
  assert.deepEqual(larger.Positions.Farmhouse, c.Positions.Farmhouse);
  assert.equal(map.properties.SpouseAreaLocation, '189 6');
  for (const id of ['Farmhouse', 'Cave', 'Greenhouse', 'Shipping Bin', 'Pet Bowl']) {
    const blocked = defaults(); blocked.Positions[id] = { X: 149, Y: id === 'Cave' ? 5 : 6 };
    assert.ok(validate(blocked).some(e => e.includes('配偶活动区')), id);
    assert.throws(() => makeMap(base, blocked), /配偶活动区/);
  }
});

test('the cave only moves along straight stretches of the north cliff', () => {
  for (const [X, Y] of [[85, 55], [34, 6], [34, 4], [60, 20]]) {
    const c = defaults(); c.Positions.Cave = { X, Y };
    assert.ok(validate(c).some(e => e.includes('北侧山壁')), `${X},${Y}`);
    assert.throws(() => makeMap(base, c));
  }
  // The curved cliff at the east end passes validation but has no straight face to cut.
  for (const X of [124, 125, 126]) {
    const c = defaults(); c.Positions.Cave = { X, Y: 5 };
    assert.deepEqual(validate(c), []);
    assert.throws(() => makeMap(base, c), /北侧山壁/, `${X}`);
  }
  const c = defaults(), before = makeMap(base, c);
  c.Positions.Cave = { X: 85, Y: 5 };
  const map = makeMap(base, c);
  // Old entrance closed across its full height; the new one sits in the extended wall with nothing else touched.
  for (let y = 0; y < 4; y++) for (let x = 31; x < 38; x++) {
    assert.equal(index(map, 'Buildings', x, y), 16);
    for (const id of ['Front', 'AlwaysFront', 'AlwaysFront2']) assert.equal(index(map, id, x, y), null);
  }
  for (let y = 4; y <= 7; y++) for (let x = 31; x < 38; x++) assert.equal(isPassable(map, x, y), false);
  assert.equal(index(map, 'Buildings', 85, 4), 1634);
  sameArea(map, before, { x: 0, y: 10, w: 160, h: 120 });
  assert.equal(map.properties.FarmCaveEntry, '85 6');
  assert.match(map.properties.Warp, /85 5 FarmCave 8 11/);
  assert.deepEqual(connectivity(map, c), []);
});

test('caves can move one tile along the north wall without erasing their new entrance', () => {
  for (const x of [33, 35, 36, 50, 90]) {
    const c = defaults(); c.Positions.Cave = { X: x, Y: 5 }; c.Positions.Backwoods = { X: 100, Y: 0 };
    const map = makeMap(base, c);
    assert.equal(index(map, 'Buildings', x, 4), 1634);
    assert.equal(index(map, 'AlwaysFront', x, 5), 1659);
    assert.equal(isPassable(map, x, 6), true);
    assert.deepEqual(connectivity(map, c), []);
    let arches = 0;
    for (const row of layer(map, 'Buildings').tiles) for (const t of row) if (t?.index === 1634) arches++;
    assert.equal(arches, 1);
  }
  const c = defaults(); c.Positions.Cave = { X: 126, Y: 5 };
  assert.throws(() => makeMap(base, c), /北侧山壁/); // curved cliff cannot be sliced into a flat opening
});

test('small exit moves remove old openings and align fence caps with adjacent posts', () => {
  for (const y of [15, 16, 18, 19, 20, 21, 22, 70]) {
    const c = defaults(); c.Positions.Bus = { X: 159, Y: y };
    const map = makeMap(base, c), upper = y <= 21 ? 158 : 157;
    assert.equal(index(map, 'Buildings', upper, y - 3), 411, `upper cap ${y}`);
    assert.notEqual(index(map, 'Buildings', upper === 158 ? 157 : 158, y - 3), 411, `extra cap ${y}`);
    for (let yy = y - 2; yy <= y + 1; yy++) for (let x = 156; x < 160; x++) assert.equal(isPassable(map, x, yy), true);
    for (let yy = 15; yy <= 18; yy++) if (yy < y - 2 || yy > y + 1) assert.equal(isPassable(map, 159, yy), false);
    assert.deepEqual(connectivity(map, c), []);
  }
  for (const [id, xs] of [['Backwoods', [39, 41, 42, 90]], ['Forest', [39, 40, 42, 43, 100]]]) for (const x of xs) {
    const c = defaults(); c.Positions.Cave = { X: 70, Y: 5 }; c.Positions[id] = { X: x, Y: id === 'Forest' ? 129 : 0 };
    const map = makeMap(base, c), y = c.Positions[id].Y, open = id === 'Forest' ? [x - 1, x] : [x, x + 1];
    for (const xx of open) assert.equal(isPassable(map, xx, y), true);
    for (const xx of [40, 41]) if (!open.includes(xx)) assert.equal(isPassable(map, xx, y), false);
    assert.deepEqual(connectivity(map, c), []);
  }
});

test('restoring moved landmarks reproduces the original map without accumulated remnants', () => {
  const c = defaults(), before = makeMap(base, c), moved = structuredClone(c);
  Object.assign(moved.Positions, { Cave: { X: 70, Y: 5 }, Farmhouse: { X: 100, Y: 70 }, Bus: { X: 159, Y: 19 }, Forest: { X: 43, Y: 129 }, Backwoods: { X: 43, Y: 0 } });
  assert.deepEqual(connectivity(makeMap(base, moved), moved), []);
  assert.deepEqual(makeMap(base, c), before);
});

test('the shrine moves along the north bank by one tile without copying trees', () => {
  const originalConfig = defaults(), before = makeMap(base, originalConfig);
  for (const x of [7, 9, 10, 12, 18, 60, 90]) {
    const c = defaults(); c.Positions.Shrine = { X: x, Y: 7 };
    const map = makeMap(base, c);
    assert.deepEqual(connectivity(map, c), []);
    assert.equal(map.properties.GrandpaShrineLocation, `${x} 7`);
    assert.equal(layer(map, 'Buildings').tiles[7][x].properties.Action, 'Message "Farm.1"');
    sameArea(map, before, { x: 0, y: 0, w: 120, h: 4 });
    // Only the central memorial and its paving change on the existing bank.
    for (const id of ['Front', 'AlwaysFront', 'AlwaysFront2']) assert.deepEqual(layer(map, id), layer(before, id));
    let shrines = 0;
    for (const row of layer(map, 'Buildings').tiles) for (const t of row) if (t?.index === 1957) shrines++;
    assert.equal(shrines, 1);
  }
});

test('a detached shrine has closed rock ends, paving and no rectangular canopy', () => {
  for (const [X, Y] of [[8, 12], [20, 15], [70, 70]]) {
    const c = defaults(), before = makeMap(base, c);
    c.Positions.Shrine = { X, Y };
    const map = makeMap(base, c);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      assert.equal(index(map, 'Buildings', X - 1 + col, Y - 2 + row), 1906 + row * 25 + col);
    }
    for (let row = 0; row < 4; row++) {
      assert.equal(index(map, 'Buildings', X - 2, Y - 3 + row), [466, 491, 516, 541][row]);
      assert.equal(index(map, 'Buildings', X + 2, Y - 3 + row), [469, 494, 519, 544][row]);
    }
    assert.equal(index(map, 'Back', X, Y + 1), 838);
    assert.equal(index(map, 'Back', X, Y + 2), 472);
    assert.equal(isPassable(map, X, Y + 1), true);
    sameArea(map, before, { x: 0, y: 0, w: 20, h: 4 });
    for (const id of ['Front', 'AlwaysFront', 'AlwaysFront2']) {
      sameArea(map, before, { x: X - 3, y: Y - 4, w: 1, h: 7 });
      assert.deepEqual(layer(map, id).tiles.slice(0, 10).map(row => row.slice(0, 15)), layer(before, id).tiles.slice(0, 10).map(row => row.slice(0, 15)));
    }
    assert.deepEqual(connectivity(map, c), []);
  }
});

test('shrine placements still protect water, the curved cliff and other landmarks', () => {
  for (const [X, Y] of [[8, 8], [6, 7], [36, 114], [128, 7], [34, 7], [149, 7]]) {
    const c = defaults(); c.Positions.Shrine = { X, Y };
    assert.throws(() => makeMap(base, c), undefined, `${X},${Y}`);
  }
  const c = defaults(), original = makeMap(base, c);
  c.Positions.Shrine = { X: 70, Y: 70 }; makeMap(base, c);
  c.Positions.Shrine = { X: 8, Y: 7 };
  assert.deepEqual(makeMap(base, c), original);
});
