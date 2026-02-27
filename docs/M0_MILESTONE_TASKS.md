# M0 Milestone Task List

This is the planned execution checklist for the current M0 milestone.

## A. Foundation and Tooling
- [x] Bootstrap React + TypeScript + Vite project structure.
- [x] Add Zustand runtime state store foundation.
- [x] Add base scripts (`dev`, `build`, `preview`) in `package.json`.
- [x] Add baseline `.gitignore` entries for Node/Vite artifacts.

## B. Project Structure Cleanup
- [x] Organize source tree into domain-driven folders:
  - `src/app`
  - `src/features/battle/components`
  - `src/features/simulation/store`
  - `src/shared/styles`
- [x] Update imports to reflect new structure.

## C. M0 Runtime and UI Deliverables
- [x] 3x6 panel board renderer.
- [x] Global simulation tick runtime service (route-independent).
- [x] 1x/2x/4x speed controls and runtime tick HUD.
- [x] Initial board styling for player/enemy-side readability.
- [x] Ensure root/body background + text contrast defaults so deployed page is visible without runtime debugging.
- [x] Add HTML boot fallback text so GitHub Pages never appears fully blank during script/asset failures.
- [x] Add static `docs/test-page.html` for deployment smoke-testing independent of app JS runtime (compatible with branch root/docs Pages modes).

## D. Deployment Setup (GitHub Pages)
- [x] Configure Vite `base` for GitHub Pages builds with relative asset paths (`./`) to avoid project-path mismatches.
- [x] Add GitHub Actions workflow to build and deploy Pages.
- [ ] Verify deployment on repository Pages settings once CI runs.

## E. Validation Tasks for M0 Completion
- [ ] Install dependencies in a network-enabled environment.
- [ ] Run `npm run build` to verify production build output.
- [ ] Run `npm run dev` and manually verify board/speed controls.
- [ ] Capture screenshot artifact after runtime verification.
