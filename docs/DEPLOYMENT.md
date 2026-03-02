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


## How to confirm M1 is actually running
When React boots correctly, the page header reads **"Idle Network — M1 Combat Vertical Slice"** and shows:
- MegaMan + Mettaur labels on the 3x6 board
- HP cards for MegaMan and Mettaur
- combat log text (e.g. buster/telegraph events)
- keyboard movement support (Arrow keys / WASD)

If you instead see **"M0 Foundation (Static Fallback)"**, then M1 is not executing in browser runtime and Pages source is likely still branch mode.
