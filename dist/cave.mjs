import { boundaryBrush } from './perimeter.mjs';

// Only the three-column stone entrance is a movable landmark. The surrounding
// trees and continuous north cliff belong to the perimeter, not to the cave.
export function restoreCave(base, map, sourceRect) {
  boundaryBrush(base, map).closeNorth({ x: sourceRect.x, y: 0, w: sourceRect.w, h: 10 });
}

export function placeCave(base, map, destination) {
  const { source, ground, set, clearTrees } = boundaryBrush(base, map);
  clearTrees(destination);
  const x0 = destination.x + 2, y0 = destination.y + 3;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    set(x0 + x, y0 + y, Object.fromEntries(Object.entries(source).map(([id, tiles]) => [id, id === 'Paths' ? null : tiles[4 + y][33 + x]])));
  }
  if (y0 !== 4) {
    // On open land the cliff needs its own left/right end caps. A raw slice of
    // the north wall has hard vertical cuts and looks like a missing texture.
    for (const [x, sx] of [[x0 - 1, 42], [x0 + 3, 39]]) for (let y = 0; y < 5; y++) {
      set(x, y0 + y, { Back: y === 4 ? source.Back[8][14] : ground, Buildings: source.Buildings[4 + y][sx] });
    }
  }
}

export function isNorthCliff(map, x) {
  const tiles = map.layers.find(l => l.id === 'Buildings').tiles;
  const faces = [[446, 467, 468], [447, 492, 493], [448, 517, 518], [542, 543]];
  return faces.every((ids, y) => [-1, 0, 1].every(dx => {
    const t = tiles[y + 4][x + dx];
    return t?.sheet === 'untitled tile sheet' && ids.includes(t.index);
  }));
}
