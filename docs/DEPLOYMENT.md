# GitHub Pages deployment

The public site is https://link1412.github.io/FarmxN/.

Every push to `main` runs `.github/workflows/pages.yml`: it installs dependencies, runs the tests, builds `site/` and deploys it with GitHub's Pages actions. The repository's Pages source is **GitHub Actions**. No branch holds build output and nothing from `site/` is committed.

To build locally:

```sh
npm ci
npm test
npm run build
```

`site/index.html` is the whole site. The single file embeds gzip-compressed map data, preview images and its worker; no maps are hosted, visitors generate them locally. Use a modern browser with module workers and `DecompressionStream` support.

`.github/workflows/ci.yml` runs the test suite on Node 22 and 24 for pull requests.

The former `gh-pages` branch is no longer used.
