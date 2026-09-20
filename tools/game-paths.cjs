const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function gamePaths() {
  const home = os.homedir();
  const candidates = process.env.STARDEW_GAME ? [process.env.STARDEW_GAME] : [
    path.join(home, 'Library/Application Support/Steam/steamapps/common/Stardew Valley/Contents/MacOS'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Steam/steamapps/common/Stardew Valley'),
    path.join(home, '.steam/steam/steamapps/common/Stardew Valley'),
    path.join(home, '.local/share/Steam/steamapps/common/Stardew Valley'),
  ];
  const game = candidates.find(p => fs.existsSync(path.join(p, 'xTile.dll')));
  if (!game) throw Error('Game not found. Set STARDEW_GAME to the directory containing xTile.dll (on macOS: Stardew Valley/Contents/MacOS).');
  const content = process.env.STARDEW_CONTENT || (path.basename(game) === 'MacOS' ? path.resolve(game, '../Resources/Content') : path.join(game, 'Content'));
  if (!fs.existsSync(path.join(content, 'Maps/Farm.xnb'))) throw Error('Farm.xnb not found. Set STARDEW_CONTENT to the game Content directory.');
  return { game: path.resolve(game), content: path.resolve(content) };
}
module.exports = { gamePaths };
