# Deployment Notes (GitHub Pages)

## Why the app can look stuck on "Loading Idle Network..."
If GitHub Pages is set to **Deploy from a branch** (`main` + `/root` or `/docs`), GitHub serves raw repository files.
This project is Vite + TypeScript and needs a build step, so serving raw source does not execute the app bundle.

## Recommended setup (for this repo)
1. Go to **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Keep using `.github/workflows/deploy-pages.yml` to run `npm install` + `npm run build` and publish `dist`.

## Quick verification URLs
- App root: `/IdleNetwork/`
- Static smoke test page: `/IdleNetwork/docs/test-page.html`

If smoke test works but app root stays on the loading fallback, Pages source is likely still branch mode instead of Actions mode.
