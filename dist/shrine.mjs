import { boundaryBrush } from './perimeter.mjs';

// The shrine is three columns wide. The surrounding canopy and north bank
// belong to the farm, and must never travel with the memorial.
export function restoreShrine(base, map) {
  const { source, target } = boundaryBrush(base, map);
  for (let y = 5; y <= 7; y++) for (let x = 7; x <= 9; x++) {
    target.Buildings[y][x] = structuredClone(source.Buildings[y][14 + x % 2]);
  }
  for (let y = 8; y <= 9; y++) for (let x = 7; x <= 9; x++) {
    target.Back[y][x] = structuredClone(source.Back[y][14 + x % 2]);
  }
}

export function shrineOnNorthBank(map, destination) {
  if (destination.y !== 3) return false;
  const tiles = map.layers.find(l => l.id === 'Buildings').tiles;
  const faces = [[446, 467, 468], [447, 492, 493], [448, 517, 518], [542, 543]];
  return faces.every((ids, y) => Array.from({ length: destination.w }, (_, x) => {
    const tile = tiles[y + 4][destination.x + x];
    return tile?.sheet === 'untitled tile sheet' && ids.includes(tile.index);
  }).every(Boolean));
}

export function placeShrine(base, map, destination) {
  const { source, ground, set, target } = boundaryBrush(base, map);
  const attached = shrineOnNorthBank(map, destination);
  const x0 = destination.x + 1, y0 = destination.y + 1;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 3; x++) {
    // Preserve trees on the bank and the new site's ground outside the paving.
    if (attached) {
      if (y >= 1 && y <= 3) target.Buildings[y0 + y][x0 + x] = structuredClone(source.Buildings[y + 4][x + 7]);
      if (y >= 4) target.Back[y0 + y][x0 + x] = structuredClone(source.Back[y + 4][x + 7]);
      target.Paths[y0 + y][x0 + x] = null;
    } else {
      set(x0 + x, y0 + y, { Back: source.Back[y + 4][x + 7], Buildings: source.Buildings[y + 4][x + 7] });
    }
  }
  if (!attached) {
    for (let x = 0; x < 5; x++) set(destination.x + x, destination.y, { Back: { ...ground, index: x === 0 ? 178 : x === 4 ? 252 : 251 } });
    // Detached memorials need complete rock ends, not a rectangular wall cut.
    for (const [x, sx] of [[x0 - 1, 42], [x0 + 3, 39]]) for (let y = 0; y < 5; y++) {
      set(x, y0 + y, { Back: y === 4 ? source.Back[8][14] : ground, Buildings: source.Buildings[4 + y][sx] });
    }
  }
}
