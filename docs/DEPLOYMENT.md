# GitHub Pages deployment

The public site is https://link1412.github.io/FarmxN/.

The initial release uses GitHub Pages' **Deploy from a branch** mode: branch `gh-pages`, directory `/`. Source stays on `main`; only the generated `site/` contents belong on `gh-pages`.

To update the generated files:

```sh
npm ci
npm test
npm run build
```

Publish the contents of `site/` to the `gh-pages` branch using your usual GitHub Pages deployment tooling. Keep `.nojekyll`. Committing source changes to `main` alone does not refresh the branch-deployed site.

An optional Actions template is in `docs/github-pages-workflow.yml`. To switch to automatic deployment, an owner with workflow-writing permission can put it at `.github/workflows/pages.yml` and change the repository's Pages source to **GitHub Actions**. It builds and tests on pushes to `main` and deploys only the generated site.

`.github/workflows/ci.yml` runs the test suite on Node 22 and 24 for pushes to `main` and pull requests. It does not deploy: Pages stays branch-based until the optional template above is installed.

`site/index.html` is the whole site. The single file embeds gzip-compressed map data, preview images and its worker; no maps are hosted, visitors generate them locally. Use a modern browser with module workers and `DecompressionStream` support. There is no separate online resource manifest or asset service.
