# Farm x N

星露谷物语标准农场地图编辑器。自由设置地图尺寸、移动设施和出口，导出 **Farm.tmx**。

**[打开在线编辑器](https://link1412.github.io/FarmxN/)** · [English](README.md) · [Nexus Mods](https://www.nexusmods.com/stardewvalley/mods/52634)

## 无需下载

一切都在浏览器里完成：打开编辑器，选好尺寸、调整点位，点击导出即可。仓库不托管任何地图，编辑过程中也不会再请求任何文件。页面本身是一个约 600 KB 的单文件 HTML，已内嵌底图和预览图片；想离线使用，直接在浏览器里保存网页（Ctrl/⌘ S）。

**建议娱乐体验：请先备份存档，并新建标准农场存档。**

## 功能

- 最小 **80 × 65**，最大 4096 × 4096（**Farm x 3226**）。超过 2048 × 2048 的地图在浏览器和游戏里都需要数 GB 空闲内存，生成、导出和加载都更慢。
- 面积以 **Farm x N** 显示：默认大地图为 2048 × 2048，即 **Farm x 806.6**。编辑器默认打开 160 × 130（**Farm x 4**），预设里可以直接选 2048 × 2048（**Farm x 806.6**）和 4096 × 4096。倍数按总地图面积计算，并非可耕种面积。
- 支持农舍、温室、洞穴、爷爷神龛、出货箱、宠物水碗及三个出口移动。
- 移动出口时重建原开口和新开口，保留地图属性、动画及返回坐标。
- 配偶活动区固定；导出前检查地形、重叠和通行。
- 界面支持中文和英文：按浏览器语言自动选择，也可在页面右上角切换。
- 布局自动保存在浏览器中，刷新后恢复。
- 支持撤销、重做（Ctrl/⌘ Z、Ctrl/⌘ ⇧ Z），地图获得焦点时可用方向键微调选中设施（按住 Shift 为 10 格）。
- 页面仅导出 TMX 和布局 JSON，不需要账号或服务器。

## 生成并安装地图

1. 安装星露谷物语 1.6、SMAPI 4 和 Content Patcher。
2. 打开[编辑器](https://link1412.github.io/FarmxN/)，设置尺寸、调整点位，点击「导出 TMX」得到 `Farm.tmx`。
3. 把仓库里的 `templates/[CP] FarmxN` 复制到游戏的 `Mods` 目录，将 `Farm.tmx` 放进它的 `assets` 文件夹：

```text
Stardew Valley/Mods/[CP] FarmxN/assets/Farm.tmx
```

4. 通过 SMAPI 启动，**新建标准农场**。

模板本身不含地图。`[CP] FarmxN` 不是强制文件夹名，加载路径由 `content.json` 的 `FromFile` 指定。模板引用游戏自带贴图，不需要复制预览 PNG，也不要把 TMX 改名后覆盖原版 XNB。

## 限制

- 只支持标准农场，不迁移已有存档中的建筑、作物或物件。
- 不要同时启用另一个替换 `Maps/Farm` 的模组。
- 面积上限只是编辑器预算，不保证游戏能顺利加载或流畅运行；4096 × 4096 的 TMX 约 240 MB。依赖原版固定坐标的第三方事件可能不兼容。
- 洞穴只能沿北侧平直山壁移动；神龛可沿北岸或放在空地；出口沿对应边界移动。

## 本地开发与构建

需要 Node.js 22 或更新版本：

```sh
git clone https://github.com/link1412/FarmxN.git
cd FarmxN
npm ci
npm start
```

打开 `http://127.0.0.1:8765/`。仓库已包含预览资源，普通用户无需提取游戏文件。

`npm test` 运行测试；`npm run build` 生成 `site/index.html`（单文件页面），构建产物不提交到仓库。推送到 `main` 或提交 Pull Request 时，GitHub Actions 会自动运行测试。`site/` 用于 GitHub Pages，目前从 `gh-pages` 分支发布；更新方式及可选 Actions 配置见 [部署说明](docs/DEPLOYMENT.md)。

游戏更新后，维护者可通过 .NET SDK 10、SMAPI 与 `npm run prepare-assets` 从本地游戏重新提取资源。详情见英文 README。

源码采用 ISC 许可，游戏贴图与原始地图数据不在源码许可范围内，属于各自权利人。本项目为非官方社区工具。
