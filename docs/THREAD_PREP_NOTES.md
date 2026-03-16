# Thread Preparation Notes

Prepared after the Area Map + FireMan + projectile + infinite-wave milestone and subsequent progression/economy tuning passes.

## Current immediate priorities
- Stabilize M3 progression UX and result transitions with targeted runtime QA.
- Validate and tune the new weighted gacha + x10 quality-floor behavior.
- Continue M3 roadmap by deepening shop/trader presentation once baseline balance is validated.

## What is already implemented
- **Area Map scene** with area selection/unlock highlighting.
- **FireMan enemy support** in board rendering and enemy data.
- **Projectile effect grammar + runtime** (`projectile:rows=...;maxRange=...;speed=...`) and CSV-backed tuning.
- **Wave/infinite progression** including:
  - standard 10-wave progression,
  - boss retry path,
  - infinite-wave grind,
  - challenge-boss-from-infinite flow.
- **Area NetDealer economy pages**:
  - Chip Trader (x1/x10 pulls), now with weighted outcomes and x10 quality floor.
  - Higsby's Shop with MB-tiered pricing and timed rotation.
- **Boss result-screen transition fixes**:
  - first-time boss clears now show results before switching to Area Map,
  - already-cleared boss clears now also show results before returning to Wave ∞.

## Assets and data references
- FireMan sprites: `public/sprites/fireman/`
- Chip tuning + grammar: `src/features/chips/data/`
- Enemy attack tuning: `src/features/enemies/data/`
- Runtime store flow: `src/features/simulation/store/gameStore.ts`
- Scene wiring: `src/app/App.tsx`, `src/features/world/components/AreaMapScene.tsx`, `src/features/world/components/ChipTraderScene.tsx`, `src/features/world/components/HigsbyShopScene.tsx`

## Re-validation status
- Progression/map/shop/trader baseline was re-checked after the weighted-gacha + pricing pass.
- No new blockers found in baseline automation checks; proceed with targeted transition/economy QA matrix in next thread.

## Operational notes
- Duplicate helper script: `npm run check:game-store-duplicates`
- Test command: `node --test tests/*.test.mjs`
- Build command: `npm run build`
- Local Jersey 10 font files should live in `public/fonts/jersey-10/`.
- Build may emit runtime font resolve warnings when the `.woff2` is missing.
