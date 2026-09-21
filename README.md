# Farm x N

**Make room for a bigger farm.** A browser map editor for Stardew Valley's standard farm: choose your dimensions, move landmarks, and export a **TMX** map.

**[Open the editor](https://link1412.github.io/FarmxN/)** · [中文说明](README.zh-CN.md) · [Nexus Mods](https://www.nexusmods.com/stardewvalley/mods/52634)

## Nothing to download

Everything happens in your browser. Open the editor, pick a size, move the landmarks and export. No maps are hosted here and nothing is fetched while you work: the page is one self-contained HTML file of about 600 KB with the base map and preview images embedded. To use it offline, save the page from your browser (Ctrl/⌘ S).

**For fun and creative play:** back up your saves and start a new Standard Farm.

## Features

- **Flexible dimensions:** minimum 80 × 65, maximum 4096 × 4096 (**Farm x 3226**). The editor opens at 160 × 130 (**Farm x 4**); presets go up to 2048 × 2048 (**Farm x 806.6**) and 4096 × 4096. Maps above 2048 × 2048 need several GB of free memory in the browser and in the game, and take longer to generate, export and load.
- **Movable landmarks:** farmhouse, greenhouse, cave, Grandpa's shrine, shipping bin, pet bowl and three exits.
- **Boundary rebuilding:** moving an exit closes its old opening and joins its new one to the surrounding terrain.
- **Preserved metadata:** map properties, tile properties, animations and entry/return coordinates are carried into TMX.
- **Checks before export:** overlapping facilities, unsupported terrain and disconnected walking routes are rejected.
- **Large-map preview:** bounded overview canvas with visible-tile drawing when zoomed in.
- **One editor, online or offline:** exactly the same HTML file, with compressed base map data and embedded preview images. Data is unpacked when the editor becomes visible; images decode when needed. No account or backend. The editor exports only `Farm.tmx`.
- **English and Chinese interface:** chosen from the browser language and switchable from the header. Landmark names, validation messages and worker errors follow the selected language.
- **Layouts that survive a refresh:** the current layout is saved in the browser and reopened next time.
- **Undo, redo and keyboard nudging:** Ctrl/⌘ Z and Ctrl/⌘ ⇧ Z step through up to 60 changes; the arrow keys move the selected landmark one tile (ten with Shift) while the map has focus.
- **Background generation:** map generation and TMX export run in a background worker. The canvas uses a bounded overview and caches visible chunks (up to 32 MiB), with one redraw per animation frame. Dragging a landmark previews its position; release it to rebuild and validate the map.

The **Farm x N** multiplier is total map area divided by the original 80 × 65 area, not plantable space.

The interface is available in English and Chinese. The spouse activity area stays in its original location.

## Make and install a map

1. Install your own copy of **Stardew Valley 1.6**, [SMAPI 4](https://smapi.io/) and [Content Patcher](https://www.nexusmods.com/stardewvalley/mods/1915).
2. Open [the editor](https://link1412.github.io/FarmxN/).
3. Apply your width and height. Select a landmark and drag it or enter coordinates.
4. Scroll to zoom, drag empty space to pan, nudge the selected landmark with the arrow keys, and use Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z to undo and redo.
5. Select **Export TMX** to save `Farm.tmx`. The layout also stays in your browser until you change it.
6. Copy `templates/[CP] FarmxN` from this repository into the game's `Mods` directory and put `Farm.tmx` into its `assets` folder:

```text
Stardew Valley/
└── Mods/
    └── [CP] FarmxN/
        ├── manifest.json
        ├── content.json
        └── assets/
            └── Farm.tmx
```

7. Launch through SMAPI and create a **new standard farm**.

The template alone has no map. The content pack uses the game's own tilesheets; you do not need to copy preview PNGs into the game.

`[CP] FarmxN` is a naming convention, not a required folder name: `content.json`'s `FromFile` determines the loaded path. An existing map content pack can load the exported TMX instead. A TMX file cannot be renamed to XNB or dropped over the original `Content/Maps/Farm.xnb`.

## Current limitations

- **Standard farm only; new saves intended.** A map replacement does not migrate buildings, crops or objects in an existing save.
- Avoid another mod which also replaces `Maps/Farm`.
- The area cap is an editor budget, not a guarantee that the game loads or runs a map of that size smoothly. A 4096 × 4096 TMX is roughly 240 MB.
- The cave moves only along straight sections of the north cliff. The shrine can sit on the north bank or stand on clear land. Exits stay on their corresponding map edge.
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
npm test          # map, boundary, movement, export and i18n tests
npm run build    # site/index.html, the single self-contained page
```

GitHub Actions runs the same tests on Node 22 and 24 for every pull request (`.github/workflows/ci.yml`), and the deployment workflow runs them again before publishing.

`site/` is the generated GitHub Pages directory. Every push to `main` builds and deploys it through GitHub Actions (`.github/workflows/pages.yml`); see the [deployment notes](docs/DEPLOYMENT.md). No build output is committed.

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
