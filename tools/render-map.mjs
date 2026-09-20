import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { defaults } from '../dist/core.mjs';
import { makeMap } from '../dist/map.mjs';

const width = Number(process.argv[2] ?? 160);
const height = Number(process.argv[3] ?? 130);
const output = process.argv[4] ?? '/tmp/farm-n-map.png';
const source = JSON.parse(fs.readFileSync('dist/assets/farm.json', 'utf8'));
const config = process.argv[5] ? JSON.parse(fs.readFileSync(process.argv[5], 'utf8')) : defaults(width, height);
const map = makeMap(source, config);
const imageCache = new Map();

function getSheet(tile) {
  const sheet = map.sheets.find(item => item.id === tile.sheet);
  if (!sheet) throw new Error(`Unknown sheet ${tile.sheet}`);
  const basename = path.basename(sheet.image);
  if (!imageCache.has(basename)) {
    imageCache.set(basename, PNG.sync.read(fs.readFileSync(`dist/assets/${basename}.png`)));
  }
  return { sheet, image: imageCache.get(basename) };
}

function blit(target, tile, tx, ty) {
  if (!tile) return;
  const frame = tile.frames?.[0] ?? tile;
  const { sheet, image } = getSheet(frame);
  const sx = (frame.index % sheet.width) * 16;
  const sy = Math.floor(frame.index / sheet.width) * 16;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const si = ((sy + y) * image.width + sx + x) * 4;
    const di = ((ty * 16 + y) * target.width + tx * 16 + x) * 4;
    const alpha = image.data[si + 3] / 255;
    const inverse = 1 - alpha;
    target.data[di] = image.data[si] * alpha + target.data[di] * inverse;
    target.data[di + 1] = image.data[si + 1] * alpha + target.data[di + 1] * inverse;
    target.data[di + 2] = image.data[si + 2] * alpha + target.data[di + 2] * inverse;
    target.data[di + 3] = 255;
  }
}

const outputImage = new PNG({ width: map.width * 16, height: map.height * 16 });
for (const layer of map.layers.filter(item => item.id !== 'Paths')) {
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    blit(outputImage, layer.tiles[y][x], x, y);
  }
}
fs.writeFileSync(output, PNG.sync.write(outputImage));
console.log(output);
