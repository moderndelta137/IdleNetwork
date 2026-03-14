# Thread Preparation Notes

Prepared after the Area Map + FireMan + projectile + infinite-wave milestone landed and follow-up boss-result flow fixes were completed.

## Current immediate priorities
- Stabilize and polish M3 progression UX (result transitions, map flow, infinite challenge loop).
- Continue M3 roadmap: tune/expand newly-added shop+gacha economy after progression flow stabilization.

## What is already implemented
- **Area Map scene** with area selection/unlock highlighting.
- **FireMan enemy support** in board rendering and enemy data.
- **Projectile effect grammar + runtime** (`projectile:rows=...;maxRange=...;speed=...`) and CSV-backed tuning.
- **Wave/infinite progression** including:
  - standard 10-wave progression,
  - boss retry path,
  - infinite-wave grind,
  - challenge-boss-from-infinite flow.
- **Area NetDealer economy baseline** on Area Map (direct chip buys + gacha roll into Stock).
- **Boss result-screen transition fixes**:
  - first-time boss clears now show results before switching to Area Map,
  - already-cleared boss clears now also show results before returning to Wave ∞.

## Assets and data references
- FireMan sprites: `public/sprites/fireman/`
- Chip tuning + grammar: `src/features/chips/data/`
- Enemy attack tuning: `src/features/enemies/data/`
- Runtime store flow: `src/features/simulation/store/gameStore.ts`
- Scene wiring: `src/app/App.tsx`, `src/features/world/components/AreaMapScene.tsx`

## Operational notes
- Local Jersey 10 font files should live in `public/fonts/jersey-10/`.
- Build may emit runtime font resolve warnings when the `.woff2` is missing.
