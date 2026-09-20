# Nexus release draft

Status: **prepared, not submitted**. Repository: https://github.com/link1412/FarmxN

## Suggested listing

- Game: Stardew Valley
- Title: **FarmxN — Custom Farm Map Editor**
- Category: Modding Tools (confirm the category available in the upload form)
- Short description: **Resize the standard farm, move landmarks and export TMX maps in your browser. Includes a default 160 × 130 farm and an offline editor.**
- Release status: pre-release / beta

## Description to paste

FarmxN lets you design a larger standard farm without editing map tiles by hand.

Open the browser editor, set the width and height, reposition landmarks, and export Farm.tmx. The editor checks overlapping facilities and important walking routes before export. The included default map is 160 × 130 tiles: four times the original standard farm's area.

You can move the farmhouse, greenhouse, farm cave, Grandpa's shrine, shipping bin, pet bowl, and the backwoods, bus stop and forest exits. The spouse activity area remains in its original location. Map dimensions start at 80 × 65 with a maximum editor area of 262,144 tiles.

The editor works online through GitHub Pages or offline by opening its bundled HTML. It includes its preview images and base map data, so no setup or game-file extraction is needed for editing. The interface is currently in Chinese.

**Downloads**

- **Offline Editor:** extract the ZIP and open index.html in a modern browser. This is a tool, not a file to install into Mods.
- **Default 160 × 130 Farm:** extract [CP] FarmxN into Mods. Requires your own Stardew Valley 1.6 installation, SMAPI 4 and Content Patcher. Launch through SMAPI and create a new standard farm.

To use a custom map, replace Mods/[CP] FarmxN/assets/Farm.tmx with your exported file. Do not replace the game's original XNB files or enable another mod that also replaces Maps/Farm.

**Pre-release limitations**

Existing-save buildings, crops and objects are not migrated. Full in-game progression, events, multiplayer and seasonal testing is still pending. Custom landmark positions may conflict with mods or events that assume vanilla coordinates. The editor's size cap is not a guarantee of in-game performance.

Source and instructions: https://github.com/link1412/FarmxN
Online editor: https://link1412.github.io/FarmxN/

## Files to upload separately

| File | Description |
| --- | --- |
| `downloads/FarmxN-Editor.zip` | Offline editor; open its HTML directly. No nested ZIP archives. |
| `downloads/FarmxN-160x130.zip` | Default standard-farm content pack; requires SMAPI and Content Patcher. |

Do not mark the editor itself as requiring SMAPI to run: SMAPI and Content Patcher are required to use the exported map in game. Do not claim Nexus/Vortex integration or a tested mod-manager install flow.

## Remaining release checks

- Test a new standard-farm save in game: exits and return points, farmhouse entrance, greenhouse, cave, pet bowl, shipping bin and shrine interactions.
- Verify seasons, Grandpa's evaluation, building construction and relevant events; record the actual game and dependency versions tested.
- Capture final editor and in-game screenshots.
- Review distribution permissions for the bundled game-derived preview artwork and map data before selecting Nexus permission declarations. These assets are excluded from the editor's ISC license; do not mark them as original artwork created by the uploader.
- Choose the final permissions, credits and release status in Nexus. No upload or acceptance of Nexus terms has been performed by this project tooling.

Reference: [Nexus file submission guidelines](https://help.nexusmods.com/article/28-file-submission-guidelines), [author best practices](https://help.nexusmods.com/article/136-best-practices-for-mod-authors).
