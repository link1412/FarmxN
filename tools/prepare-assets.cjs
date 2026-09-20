const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { gamePaths } = require('./game-paths.cjs');

try {
  process.chdir(path.resolve(__dirname, '..'));
  const { game, content } = gamePaths();
  if (!fs.existsSync(path.join(game, 'smapi-internal/TMXTile.dll'))) throw Error('Install SMAPI first: its TMX reader is required by the asset preparation/validation tool.');
  const env = { ...process.env, STARDEW_CONTENT: content };
  execFileSync('dotnet', ['build', 'tools/Inspector', `-p:GamePath=${game}`], { stdio: 'inherit', env });
  const output = path.resolve('tools/Inspector/bin/Debug/net10.0');
  // On Apple Silicon, adjust only the copied managed assemblies in the build
  // output. Never write to the installed game or its DLLs.
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    for (const file of fs.readdirSync(output).filter(n => n.endsWith('.dll'))) {
      const target = path.join(output, file), bytes = fs.readFileSync(target);
      if (bytes.length < 64 || bytes.toString('ascii', 0, 2) !== 'MZ') continue;
      const offset = bytes.readUInt32LE(0x3c);
      if (offset + 6 <= bytes.length && bytes.readUInt16LE(offset + 4) === 0x8664) {
        bytes.writeUInt16LE(0xaa64, offset + 4); fs.writeFileSync(target, bytes);
      }
    }
  }
  execFileSync('dotnet', [path.join(output, 'Inspector.dll')], { stdio: 'inherit', env });
  execFileSync(process.execPath, ['tools/extract-assets.cjs'], { stdio: 'inherit', env });
  console.log('Local preview assets are ready. Run npm start.');
} catch (error) {
  console.error(error.message); process.exitCode = 1;
}
