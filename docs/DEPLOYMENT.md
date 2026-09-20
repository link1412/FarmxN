# GitHub Pages deployment

The public site is https://link1412.github.io/FarmxN/.

The initial release uses GitHub Pages' **Deploy from a branch** mode: branch `gh-pages`, directory `/`. Source stays on `main`; only the generated `site/` contents belong on `gh-pages`.

To update the generated files:

```sh
npm ci
npm test
npm run build
```

Publish the contents of `site/` to the `gh-pages` branch using your usual GitHub Pages deployment tooling. Keep `.nojekyll` and the `downloads` directory. Committing source changes to `main` alone does not refresh the branch-deployed site.

An optional Actions template is in `docs/github-pages-workflow.yml`. To switch to automatic deployment, an owner with workflow-writing permission can put it at `.github/workflows/pages.yml` and change the repository's Pages source to **GitHub Actions**. It builds and tests on pushes to `main` and deploys only the generated site.

The initial publishing token did not have the OAuth `workflow` scope, so no custom Actions workflow was installed. This does not affect the editor or its downloads.
