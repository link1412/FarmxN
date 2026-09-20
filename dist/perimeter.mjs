// The four edges have different safe insertion points. In particular, the
// interior cut (50, 35) runs through the north slope and the west cliff's foot.
// Keep those transitions intact and insert between them instead.
const copy = tile => tile ? structuredClone(tile) : null;
// Preserve the vanilla north bank's shaded turf, grass fringe and light cliff
// lip. Filling all four rows with one meadow tile flattens the transition.
const northBack = (back, x, y) => back[y][14 + x % (y < 4 ? 8 : 2)];
// The southern border's source column contains flowers on two layers. Those
// are decorations, not a repeatable ground texture.
function southCells(source, x, y, height) {
  const sy = y - (height - 65);
  return {
    Back: sy < 61 ? source.Back[25 + (x + y) % 3][40 + (x * 3 + y) % 3] : sy === 61 ? source.Back[61][51] : sy === 62 ? source.Back[62][51] : source.Back[63][51],
    Buildings: sy >= 62 ? source.Buildings[43][0] : null,
    Front: sy === 61 ? source.Front[61][50 + x % 2] : null,
  };
}

export function expandPerimeter(base, map) {
  const dx = map.width - base.width, dy = map.height - base.height;
  const source = Object.fromEntries(base.layers.map(l => [l.id, l.tiles]));
  const target = Object.fromEntries(map.layers.map(l => [l.id, l.tiles]));
  const tile = index => ({ ...source.Buildings[43][0], index });
  const wall = source.Buildings[43][0];
  const ground = source.Back[30][40];

  function set(x, y, cells) {
    for (const id of Object.keys(target)) target[id][y][x] = copy(cells[id]);
  }
  function original(x, y, sx, sy) {
    set(x, y, Object.fromEntries(Object.keys(source).map(id => [id, source[id][sy][sx]])));
  }
  // Only place complete motifs. A short remainder stays as continuous terrain;
  // modulo-sampling an arbitrary slice would leave half a tree at either end.
  function decorate(start, length, motifs, paint) {
    let offset = 1, n = 0;
    while (offset + motifs[n % motifs.length].size < length) {
      const motif = motifs[n % motifs.length];
      paint(start + offset, motif);
      offset += motif.size + 2 + n % 3;
      n++;
    }
  }

  if (dx > 0) {
    // North: insert immediately east of the backwoods path, before the slope.
    const cut = 43;
    for (let y = 0; y < 10; y++) for (let x = cut; x < 50 + dx; x++) {
      if (x >= cut + dx) { original(x, y, x - dx, y); continue; }
      const sx = 14 + (x - cut) % 2;
      set(x, y, {
        Back: y < 4 && x === cut ? source.Back[y][43] : northBack(source.Back, x, y),
        Buildings: y < 4 ? wall : source.Buildings[y][sx],
      });
    }
    decorate(cut, dx, [{ size: 3 }], x0 => {
      for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
        target.Buildings[y][x0 + x] = copy(tile(53 + y * 25 + x));
      }
    });

    // South: the oak at columns 49–51 must stay whole, ahead of the insert.
    const south = 52;
    for (let y = map.height - 10; y < map.height; y++) for (let x = 50; x < south + dx; x++) {
      const sy = y - dy;
      if (x < south) { original(x, y, x, sy); continue; }
      set(x, y, southCells(source, x, y, map.height));
    }
    // Full trees, including their roots, sit at different canopy heights.
    // Keep every motif inside the new strip, including narrow expansions.
    const trees = [
      { size: 3, first: 3, rows: 6 }, { size: 6, first: 16, rows: 7 },
      { size: 3, first: 10, rows: 6 }, { size: 3, first: 0, rows: 6 },
      { size: 3, first: 3, rows: 6 }, { size: 6, first: 16, rows: 7 },
    ];
    decorate(south, dx, trees, (x0, motif) => {
      for (let y = 0; y < motif.rows; y++) for (let x = 0; x < motif.size; x++) {
        // The atlas packs unrelated doors/rocks beside the cherry's narrow
        // trunk. Its lower three rows contain only the two middle columns.
        if (motif.first === 16 && y >= 4 && x !== 2 && x !== 3) continue;
        target.AlwaysFront[map.height - motif.rows + y][x0 + x] = copy(tile(motif.first + x + y * 25));
      }
    });
    // Sparse ground accents between trunks replace the repeated flower stripe.
    for (let x = south + 3; x < south + dx - 2; x += 11) {
      const y = map.height - 2;
      if (!target.AlwaysFront[y][x]) target.Front[y][x] = copy(source.Buildings[63][51]);
    }
    // The moved slope no longer touches the old backwoods road. Its first
    // column must join the straight bank, not retain that road's grass edge.
    for (let y = 0; y < 3; y++) target.Back[y][43 + dx] = copy(northBack(source.Back, 43 + dx, y));
    for (let x = 44; x <= 46; x++) for (let y = 0; y < 2; y++) target.Back[y][x + dx] = copy(northBack(source.Back, x + dx, y));
    // Continue the dirt apron under the diagonal cliff tip and statue, rather
    // than leaving a thin, rectangular strip of grass in front of the fence.
    for (const sx of [47, 48]) target.Back[5][sx + dx] = copy(source.Back[7][49]);
    for (let sx = 46; sx < 54; sx++) target.Back[6][sx + dx] = copy(source.Back[7][49]);
  }

  if (dy > 0) {
    // West: retain the entire diagonal cliff and the tree below it (through 41).
    const west = 42;
    for (let y = 35; y < west + dy; y++) for (let x = 0; x < 6; x++) {
      if (y < west) { original(x, y, x, y); continue; }
      set(x, y, {
        Back: x < 2 ? source.Back[44][x] : ground,
        Buildings: x < 2 ? wall : x === 2 ? source.Buildings[42 + (y - west) % 2][2] : null,
      });
    }
    decorate(west, dy, [{ size: 7 }], y0 => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 3; x++) {
        target.Front[y0 + y][x] = copy(source.Front[48 + y][x]);
      }
    });

    // East: keep the pond and the complete cherry tree above this seam.
    const east = 44;
    for (let y = 35; y < east + dy; y++) for (let x = map.width - 4; x < map.width; x++) {
      const sx = x - dx;
      if (y < east) { original(x, y, sx, y); continue; }
      set(x, y, {
        Back: source.Back[40][sx],
        Buildings: sx === 76 ? null : sx === 77 ? source.Buildings[40][77] : wall,
      });
    }
    decorate(east, dy, [{ size: 7, sy: 37, layers: ['Front', 'AlwaysFront'] }, { size: 6, sy: 46, layers: ['Front'] }], (y0, motif) => {
      for (let y = 0; y < motif.size; y++) for (let x = 77; x < 80; x++) {
        for (const id of motif.layers) {
          target[id][y0 + y][x + dx] = copy(source[id][motif.sy + y][x]);
        }
      }
    });
  }
}

// Trees span several tiles, sometimes on different drawing layers. Erasing just
// the exit rectangle leaves the rest of an intersecting crown or trunk behind.
function treeAt(tile, sheet, foreground = false) {
  if (!tile || tile.sheet !== sheet || tile.index === 16 && !foreground || tile.index >= 175) return null;
  const col = tile.index % 25, row = Math.floor(tile.index / 25);
  const range = [[0, 3], [3, 6], [6, 10], [10, 13], [13, 16], [16, 22]].find(([a, b]) => col >= a && col < b);
  if (row >= 6 && (col < 6 || col >= 10 && col < 13)) return null;
  return range ? { col: col - range[0], row, first: range[0], width: range[1] - range[0] } : null;
}

export function boundaryBrush(base, map) {
  const source = Object.fromEntries(base.layers.map(l => [l.id, l.tiles]));
  const target = Object.fromEntries(map.layers.map(l => [l.id, l.tiles]));
  const wall = source.Buildings[43][0], ground = source.Back[30][40];
  const visible = map.layers.filter(l => !['Back', 'Paths'].includes(l.id));
  function set(x, y, cells) {
    for (const id of Object.keys(target)) target[id][y][x] = copy(cells[id]);
  }
  function clearTrees(r) {
    const cells = [], seen = new Set();
    function visit(l, x, y, t) {
      const key = `${l.id},${x},${y}`;
      if (seen.has(key)) return;
      seen.add(key); cells.push({ l, x, y, t });
    }
    for (const l of visible) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const t = treeAt(l.tiles[y][x], wall.sheet, l.id !== 'Buildings');
      if (t) visit(l, x, y, t);
    }
    for (let i = 0; i < cells.length; i++) {
      const { x, y, t } = cells[i];
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const px = x + ox, py = y + oy;
        if (px < 0 || py < 0 || px >= map.width || py >= map.height) continue;
        for (const l of visible) {
          const next = treeAt(l.tiles[py][px], wall.sheet, l.id !== 'Buildings');
          if (!next || next.first !== t.first) continue;
          // Vanilla also widens some cherry crowns by repeating their two
          // middle columns. Follow those joins as well as ordinary sprites.
          const middle = t.first === 16 && (ox === 1 && t.col === 3 && next.col === 2 || ox === -1 && t.col === 2 && next.col === 3);
          if (next.row === t.row + oy && (next.col === t.col + ox || !oy && middle)) visit(l, px, py, next);
        }
      }
    }
    for (const { l, x, y } of cells) l.tiles[y][x] = l.id === 'Buildings' ? copy(wall) : null;
  }
  function closeNorth(r) {
    clearTrees(r);
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const sx = 14 + x % 2;
      set(x, y, { Back: northBack(source.Back, x, y), Buildings: y < 4 ? wall : source.Buildings[y][sx] });
    }
  }
  return { source, target, wall, ground, set, clearTrees, closeNorth };
}

export function relocateExits(base, map, exits) {
  if (!exits.length) return;
  const { source, target, wall, ground, set, clearTrees } = boundaryBrush(base, map);
  // A gate can remove a fence or trees, but cannot cut through a pond or
  // level a raised corner. Reject those placements before changing any tile.
  const properties = t => t ? { ...map.sheets.find(s => s.id === t.sheet)?.tileProperties[t.index], ...t.properties } : {};
  for (const { id, dst } of exits) {
    if (id !== 'Bus' && id !== 'Forest') continue;
    for (let y = dst.y; y < dst.y + dst.h; y++) for (let x = dst.x; x < dst.x + dst.w; x++) {
      if (properties(target.Back[y][x]).Water) throw Error(`${id === 'Bus' ? '巴士站' : '森林'}出口不能覆盖水面，请选择连续的岸边。`);
      const t = target.Buildings[y][x];
      if (id === 'Forest' && y < map.height - 4 && t && t.index !== 16 && !treeAt(t, wall.sheet) && properties(t).Passable == null) {
        throw Error('森林出口不能切开边角的高台，请沿平直的南侧边界放置。');
      }
    }
  }
  // Capture paths and cliff/fence caps, without copying fragments of trees.
  const patches = exits.map(exit => ({ ...exit, cells: map.layers.map(l =>
    Array.from({ length: exit.src.h }, (_, y) => Array.from({ length: exit.src.w }, (_, x) => {
      const t = l.tiles[exit.src.y + y][exit.src.x + x];
      return copy(!['Back', 'Paths'].includes(l.id) && treeAt(t, wall.sheet, l.id !== 'Buildings') ? l.id === 'Buildings' ? wall : null : t);
    }))) }));
  for (const { src, dst } of patches) { clearTrees(src); clearTrees(dst); }
  for (const { id, src, dst } of patches) {
    if (id === 'Bus') {
      // Rebuild the entire old gate, including both end caps and the short
      // horizontal rails on its outside. Closing only the warp lanes leaves
      // the old upper post and rail floating beside the replacement fence.
      for (let y = src.y + 1; y < src.y + 7; y++) {
        target.Buildings[y][map.width - 2] = copy(source.Buildings[40][77]);
        target.Buildings[y][map.width - 1] = copy(wall);
        target.Front[y][map.width - 2] = null;
        target.Front[y][map.width - 1] = null;
      }
      for (let x = map.width - 3; x < map.width; x++) target.Front[src.y + 6][x] = null;
      target.Front[src.y + 6][map.width - 3] = copy({ ...wall, index: 358 });
      target.Front[src.y + 6][map.width - 2] = copy({ ...wall, index: 360 });
      target.Buildings[src.y + 7][map.width - 3] = copy({ ...wall, index: 383 });
      target.Buildings[src.y + 7][map.width - 2] = copy({ ...wall, index: 385 });
      target.Buildings[src.y + 7][map.width - 1] = copy(wall);
      continue;
    }
    for (let y = src.y; y < src.y + src.h; y++) for (let x = src.x; x < src.x + src.w; x++) {
      if (id === 'Backwoods') {
        const sx = 14 + x % 2;
        set(x, y, { Back: northBack(source.Back, x, y), Buildings: y < 4 ? wall : source.Buildings[y][sx] });
      } else {
        set(x, y, southCells(source, x, y, map.height));
      }
    }
  }
  for (const { id, src, dst, cells } of patches) {
    if (id === 'Bus') {
      // Follow the fence on each side of the gap. Near the farmhouse yard the
      // upper and lower fence occupy different columns; a fixed column leaves
      // a second, disconnected post after a one- or two-tile move.
      const column = y => y < src.y + 7 ? map.width - 2 : map.width - 3;
      const top = dst.y + 3, bottom = dst.y + 6;
      const upper = column(top - 1), lower = column(bottom + 1);
      if (top <= src.y + 7 && bottom >= src.y + 6) target.Front[src.y + 6][map.width - 3] = null;
      for (let y = top; y <= bottom; y++) {
        for (let x = column(y) - 1; x < map.width; x++) {
          // In the raised yard the existing grass/path transition already
          // supplies the correct terrain. Keep it instead of cutting a dirt
          // rectangle out of the lawn. Below the yard, remove fence shadows.
          const back = y <= src.y + 4 ? target.Back[y][x] : ground;
          set(x, y, { Back: back });
        }
      }
      // Blend the exposed ends of the grassy outer strip into the new path.
      for (const [y, index] of [[top - 1, 201], [bottom + 1, 251]]) {
        if (y <= src.y + 4) continue;
        for (let x = column(y) + 1; x < map.width; x++) target.Back[y][x] = copy({ ...ground, index });
      }
      target.Buildings[top - 1][upper] = copy(source.Buildings[13][78]);
      target.Front[top][upper] = copy(source.Buildings[14][78]);
      target.Front[bottom][lower] = copy(source.Front[18][77]);
      target.Buildings[bottom + 1][lower] = copy(source.Buildings[40][77]);
      continue;
    }
    if (id === 'Forest') {
      // Rebuild the local bank first. Only the four-column opening belongs
      // to the exit; the wider vanilla stamp includes unrelated grass, flower
      // overlays and tree ground that do not match another stretch of bank.
      for (let y = dst.y; y < dst.y + dst.h; y++) for (let x = dst.x; x < dst.x + dst.w; x++) set(x, y, southCells(source, x, y, map.height));
      for (let i = 0; i < map.layers.length; i++) for (let y = 2; y < dst.h; y++) for (let x = 2; x < 6; x++) {
        map.layers[i].tiles[dst.y + y][dst.x + x] = cells[i][y][x];
      }
      continue;
    }
    for (let i = 0; i < map.layers.length; i++) for (let y = 0; y < dst.h; y++) for (let x = 0; x < dst.w; x++) {
      map.layers[i].tiles[dst.y + y][dst.x + x] = cells[i][y][x];
    }
  }
}
