# Farm x N

**Make room for a bigger farm.** A browser map editor for Stardew Valley's standard farm: choose your dimensions, move landmarks, and export a **TMX** map.

**[Open the editor](https://link1412.github.io/FarmxN/)** · [中文说明](README.zh-CN.md) · [Nexus Mods](https://www.nexusmods.com/stardewvalley/mods/52634)

## Downloads

| File | What it contains |
| --- | --- |
| [Default 2048 × 2048 farm](https://github.com/link1412/FarmxN/raw/main/downloads/FarmxN-2048x2048.zip) | Farm x 806.6; Content Patcher map pack |
| [Offline editor](https://github.com/link1412/FarmxN/raw/main/downloads/FarmxN-Editor.zip) | Extract and open `index.html`; no server or installation needed |
| [Standalone HTML](https://github.com/link1412/FarmxN/raw/main/downloads/FarmxN-Editor.html) | The editor with its images and map data embedded in one file |
| [Default Farm.tmx](https://github.com/link1412/FarmxN/raw/main/downloads/Farm.tmx) | Just the default map, for an existing map content pack |

**For fun and creative play:** back up your saves and start a new Standard Farm.

## Features

- **Flexible dimensions:** minimum 80 × 65. Performance profiles allow 262,144 (light), 1,048,576 (balanced) or 4,194,304 (high) tiles. Auto mode recommends a profile from the memory information exposed by the browser, with a conservative light fallback. You can override it manually. The default download is 2048 × 2048, shown as **Farm x 806.6**. The editor opens this size on the high profile; other profiles start at 160 × 130 (**Farm x 4**).
- **Movable landmarks:** farmhouse, greenhouse, cave, Grandpa's shrine, shipping bin, pet bowl and three exits.
- **Boundary rebuilding:** moving an exit closes its old opening and joins its new one to the surrounding terrain.
- **Preserved metadata:** map properties, tile properties, animations and entry/return coordinates are carried into TMX.
- **Checks before export:** overlapping facilities, unsupported terrain and disconnected walking routes are rejected.
- **Large-map preview:** bounded overview canvas with visible-tile drawing when zoomed in.
- **Local editing:** no account or backend; the standalone HTML embeds preview images and base map data. The editor exports only `Farm.tmx`.

The **Farm x N** multiplier is total map area divided by the original 80 × 65 area, not plantable space. The high profile supports e.g. 2048 × 2048 (Farm x 806.6); each side is also bounded at 16,384 tiles.

The current interface is in Chinese. The spouse activity area stays in its original location. Refreshing the page discards unsaved layout changes.

## Use the default farm

1. Install your own copy of **Stardew Valley 1.6**, [SMAPI 4](https://smapi.io/) and [Content Patcher](https://www.nexusmods.com/stardewvalley/mods/1915).
2. Download the default farm ZIP and extract `[CP] FarmxN` into the game's `Mods` directory.
3. Launch through SMAPI and create a **new standard farm**.

The content pack uses the game's own tilesheets; you do not need to copy preview PNGs into the game.

## Use a custom map

1. Open the online or offline editor.
2. Apply your width and height. Select a landmark and drag it or enter coordinates.
3. Scroll to zoom, drag empty space to pan, and use Ctrl/Cmd+Z to undo.
4. Select **Export TMX** to save `Farm.tmx`.
5. Replace the map in the installed default pack:

```text
Stardew Valley/
└── Mods/
    └── [CP] FarmxN/
        ├── manifest.json
        ├── content.json
        └── assets/
            └── Farm.tmx
```

Alternatively, copy the loader in `templates/[CP] FarmxN` into `Mods` and add your exported map to its `assets` folder before launching. The template alone has no map.

`[CP] FarmxN` is a naming convention, not a required folder name: `content.json`'s `FromFile` determines the loaded path. An existing map content pack can load the exported TMX instead. A TMX file cannot be renamed to XNB or dropped over the original `Content/Maps/Farm.xnb`.

## Current limitations

- **Standard farm only; new saves intended.** A map replacement does not migrate buildings, crops or objects in an existing save.
- Avoid another mod which also replaces `Maps/Farm`.
- The area cap is an editor resource budget, not a guarantee of in-game frame rate.
- Caves and shrines can join straight sections of the north wall or stand on clear land. Exits stay on their corresponding map edge.
- Third-party events may assume vanilla coordinates; custom positions are not guaranteed compatible.

## Develop locally

Use **Node.js 22 or later**:

```sh
git clone https://github.com/link1412/FarmxN.git
cd FarmxN
npm ci
npm start
```

Open **http://127.0.0.1:8765/**. No .NET SDK or game installation is needed just to run the bundled editor.

```sh
npm test          # map, boundary, movement and export tests
npm run build    # default content pack + standalone HTML + offline ZIP
```

`site/` is the generated GitHub Pages directory. The live site is published from the `gh-pages` branch. See [deployment notes](docs/DEPLOYMENT.md) for updates and the optional Actions workflow. `downloads/` contains prebuilt downloads; rebuild it when changing the editor or map logic.

### Refresh assets after a game update

For maintainers: install .NET SDK 10 and SMAPI, then run `npm run prepare-assets`. This reads your locally installed game and regenerates the preview data and images. Set `STARDEW_GAME` to the directory containing `xTile.dll` for a non-default installation; on macOS this is `Stardew Valley/Contents/MacOS`. Set `STARDEW_CONTENT` if its `Content` directory is elsewhere. The tool only writes project files, never the game's installed DLLs.

Local extraction has been verified on macOS. Windows/Linux discovery paths are included but not yet tested on those platforms.

### TMX validation

`tools/Inspector` compares exported maps using SMAPI's TMX reader, including cells, properties and animation frames. A 512 × 512 export passed across all **1,572,864 layer cells**. After preparing the local inspector:

```sh
dotnet tools/Inspector/bin/Debug/net10.0/Inspector.dll --tmx Farm.tmx expected-map.json
```

`expected-map.json` is the JSON result of `makeMap(base, config)` from `dist/map.mjs`. `tools/render-map.mjs` also produces PNG renders for visual checks.

## Credits and license

Created by **link1412**. Original editor code is under the [ISC license](LICENSE).

The bundled preview artwork and base map data are derived from Stardew Valley and are **not covered by the source-code license**. Stardew Valley and its assets belong to ConcernedApe and their respective owners. FarmxN is an unofficial community project, not affiliated with or endorsed by ConcernedApe. Thanks to the SMAPI, Content Patcher, xTile, TMXTile and XNB tooling authors.
