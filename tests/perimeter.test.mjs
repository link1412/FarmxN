import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaults } from '../dist/core.mjs';
import { makeMap, layer, isPassable, connectivity } from '../dist/map.mjs';

const base = JSON.parse(fs.readFileSync(new URL('../dist/assets/farm.json', import.meta.url)));
const original = Object.fromEntries(base.layers.map(l => [l.id, l.tiles]));
const at = (map, id, x, y) => layer(map, id).tiles[y][x]?.index ?? null;

function assertMotif(map, id, x0, y0, sx, sy, w, h) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const apron=map.width>80&&id==='Back'&&(sy+y===6&&sx+x>=46&&sx+x<54||sy+y===5&&[47,48].includes(sx+x));
    const shoulder=map.width>80&&id==='Back'&&(sx+x===43&&sy+y<3||sx+x>=44&&sx+x<=46&&sy+y<2);
    assert.deepEqual(layer(map, id).tiles[y0 + y][x0 + x], shoulder?original.Back[sy+y][14+(x0+x)%8]:apron?original.Back[7][49]:original[id][sy + y][sx + x], `${id} incomplete tree at ${x0},${y0}`);
  }
}

test('widths 81–200 keep complete crowns, cliff faces and south hedges', () => {
  for (let w = 81; w <= 200; w++) {
    const map = makeMap(base, defaults(w, 65)), dx = w - 80;
    // North trees are cropped only by the outside of the map, never at a join.
    for (let x = 43; x < 43 + dx;) {
      assert.equal(isPassable(map, x, 5), false, `north cliff ${w}/${x}`);
      if (at(map, 'Buildings', x, 0) === 16) { x++; continue; }
      assert.ok(x + 3 <= 43 + dx);
      for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 3; xx++) {
        assert.equal(at(map, 'Buildings', x + xx, yy), 53 + yy * 25 + xx, `north tree ${w}/${x}`);
      }
      x += 3;
    }
    for (let x = 52; x < 52 + dx;) {
      assert.equal(isPassable(map, x, 63), false, `south hedge ${w}/${x}`);
      const cherry = at(map, 'AlwaysFront', x, 58) !== null;
      const first = cherry ? 16 : at(map, 'AlwaysFront', x, 59);
      if (first === null) {
        for (let y = 58; y < 65; y++) assert.equal(at(map, 'AlwaysFront', x, y), null, 'orphaned tree fragment');
        x++; continue;
      }
      assert.ok([0, 3, 10, 16].includes(first), 'only tree sprites are used');
      const size = cherry ? 6 : 3, rows = cherry ? 7 : 6;
      assert.ok(x + size <= 52 + dx);
      for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < size; xx++) {
        const trunkGap = cherry && yy >= 4 && xx !== 2 && xx !== 3;
        assert.equal(at(map, 'AlwaysFront', x + xx, 65 - rows + yy), trunkGap ? null : first + xx + yy * 25, `complete tree ${w}/${x}`);
      }
      x += size;
    }
    // Original transitions are preserved whole, including the slope that used
    // to become an isolated notch at the interior's x=50 cut.
    for (const id of Object.keys(original)) {
      assertMotif(map, id, 43 + dx, 0, 43, 0, 12, 10);
      assertMotif(map, id, 49, 55, 49, 55, 3, 10);
    }
  }
});

test('heights 66–300 keep entire trees, the west cliff foot and east fence', () => {
  for (let h = 66; h <= 300; h++) {
    const map = makeMap(base, defaults(80, h)), dy = h - 65;
    for (let y = 42; y < 42 + dy;) {
      assert.equal(isPassable(map, 2, y), false, `west boundary ${h}/${y}`);
      if (at(map, 'Front', 0, y) === null) { y++; continue; }
      assert.ok(y + 7 <= 42 + dy);
      assertMotif(map, 'Front', 0, y, 0, 48, 3, 7);
      y += 7;
    }
    for (let y = 44; y < 44 + dy;) {
      assert.equal(at(map, 'Buildings', 77, y), 386, `east fence ${h}/${y}`);
      const cherry = at(map, 'AlwaysFront', 77, y) !== null;
      if (!cherry && at(map, 'Front', 77, y) === null) { y++; continue; }
      const size = cherry ? 7 : 6;
      assert.ok(y + size <= 44 + dy);
      assertMotif(map, 'Front', 77, y, 77, cherry ? 37 : 46, 3, size);
      if (cherry) assertMotif(map, 'AlwaysFront', 77, y, 77, 37, 3, size);
      else for (let yy = 0; yy < size; yy++) for (let x = 77; x < 80; x++) assert.equal(at(map, 'AlwaysFront', x, y + yy), null);
      y += size;
    }
    for (const id of Object.keys(original)) {
      assertMotif(map, id, 0, 30, 0, 30, 6, 12);
      assertMotif(map, id, 76, 27, 76, 27, 4, 17);
    }
  }
});

test('small, odd, single-axis and maximum expansions keep all destinations reachable', () => {
  for (const [w, h] of [[81, 66], [83, 72], [89, 81], [97, 86], [80, 300], [200, 65], [200, 300]]) {
    const config = defaults(w, h);
    assert.deepEqual(connectivity(makeMap(base, config), config), [], `${w} × ${h}`);
  }
});

test('moving exits closes old paths and clears complete intersecting trees', () => {
  const config = defaults();
  Object.assign(config.Positions, { Bus: { X: 159, Y: 70 }, Forest: { X: 100, Y: 129 }, Backwoods: { X: 90, Y: 0 } });
  const map = makeMap(base, config);
  assert.deepEqual(connectivity(map, config), []);
  for (let y = 15; y <= 18; y++) assert.equal(isPassable(map, 159, y), false);
  for (let x = 40; x <= 42; x++) assert.equal(isPassable(map, x, 129), false);
  for (let x = 40; x <= 41; x++) assert.equal(isPassable(map, x, 0), false);
  for (let y = 68; y <= 71; y++) for (let x = 156; x < 160; x++) assert.equal(isPassable(map, x, y), true);
  for (let x = 99; x <= 100; x++) assert.equal(isPassable(map, x, 129), true);
  for (let x = 90; x <= 91; x++) assert.equal(isPassable(map, x, 0), true);
  // This cherry starts above the new east exit rectangle; removing just the
  // rectangle would leave its crown suspended over the new opening.
  for (let y = 63; y < 70; y++) for (let x = 157; x < 160; x++) {
    for (const id of ['Front', 'AlwaysFront']) assert.equal(at(map, id, x, y), y === 68 && x === 157 && id === 'Front' ? 436 : null);
  }
});

test('generation is deterministic and never alters the base map', () => {
  const before = JSON.stringify(base), config = defaults(87, 74);
  assert.deepEqual(makeMap(base, config), makeMap(base, config));
  assert.equal(JSON.stringify(base), before);
});

test('moving the forest opening across a pine clears its whole crown and trunk', () => {
  const c = defaults(), before = makeMap(base, c);
  assert.equal(at(before, 'AlwaysFront', 67, 124), 10);
  c.Positions.Forest = { X: 72, Y: 129 };
  const map = makeMap(base, c);
  for (let y = 124; y < 130; y++) for (let x = 67; x < 70; x++) assert.equal(at(map, 'AlwaysFront', x, y), null);
  assert.deepEqual(connectivity(map, c), []);
});

test('moving the east gate removes the old upper rail and blends new grass ends', () => {
  const c = defaults(); c.Positions.Bus.Y = 70;
  const map = makeMap(base, c);
  for (const y of [13, 14, 15, 16, 17]) {
    assert.equal(at(map, 'Buildings', 158, y), 386);
    assert.equal(at(map, 'Front', 159, y), null, 'old horizontal gate rail');
    assert.equal(at(map, 'Buildings', 159, y), 16);
  }
  for (let y = 68; y <= 71; y++) assert.equal(at(map, 'Back', 156, y), original.Back[30][40].index, 'no fence shadow across the open path');
  assert.equal(at(map, 'Back', 159, 67), 201, 'grass ends above the opening');
  assert.equal(at(map, 'Back', 159, 72), 251, 'grass begins below the opening');
  for (const y of [19, 20, 21]) {
    c.Positions.Bus.Y = y;
    const shifted = makeMap(base, c);
    assert.equal(at(shifted, 'Front', 157, 18), null, `old corner post at shift ${y}`);
  }
});

test('moving the forest gate does not bring dirt holes or duplicate grass overlays', () => {
  for (const x of [40, 42, 55, 72, 100, 120]) {
    const c = defaults(); c.Positions.Forest.X = x;
    const map = makeMap(base, c);
    for (const xx of [x - 4, x - 3, x + 2, x + 3]) {
      assert.equal(at(map, 'Back', xx, 127), original.Back[62][51].index);
      assert.equal(at(map, 'Back', xx, 128), original.Back[63][51].index);
      assert.equal(at(map, 'Front', xx, 127), null);
    }
    assert.deepEqual(connectivity(map, c), []);
  }
});

test('exits reject ponds and raised corners before cutting a broken opening', () => {
  const c = defaults(); c.Positions.Bus.Y = 30;
  assert.throws(() => makeMap(base, c), /水面/);
  c.Positions.Bus.Y = 17; c.Positions.Forest.X = 150;
  assert.throws(() => makeMap(base, c), /高台/);
});
