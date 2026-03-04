# Active Handoff Notes (M2)

This file captures the current implementation state and exact next work for a new thread.

## Current State (post-M1, active M2)
- M0 foundation/deployment pass is in place (Vite + React + TypeScript + Zustand + Pages workflow).
- M1 Combat Vertical Slice is complete.
- M2 implementation is in progress and currently includes:
  - Always-on chip hand with 5 slots.
  - Custom Gauge refill into hand slots.
  - Deck/discard reshuffle behavior when deck empties.
  - Buffered chip-use slot when MegaMan is busy.
  - MegaMan control modes: `manual`, `semiAuto`, `fullAuto`.
  - Baseline movement AI for MegaMan and Mettaur.
  - Sprite board rendering (MegaMan/Mettaur) with fallback handling.
  - Sprite hit-flash on successful damage and enemy HP overlay text.
  - Debug controls: pause/resume, frame-step, sprite-scale slider.
  - Recovery windows for MegaMan and Mettaur actions.
  - CSV-driven chip catalog and enemy attack catalog.
  - Initial grammar-aware hit checks (`hitscan` lane/range and `melee` offsets) for chip damage.
- CI includes duplicate-helper guard script for `gameStore.ts` before build.

## Confirmed Implemented in M2 So Far
- [x] Custom Gauge + chip hand flow (always-on hand model).
- [x] Manual chip usage by slot (`1-5`) and left-most quick use.
- [x] Aggressive auto-chip behavior in `fullAuto` mode.
- [x] Manual/SemiAuto/FullAuto control mode toggle for MegaMan.
- [x] Baseline AI movement loop for MegaMan + Mettaur.
- [x] Sprite rendering pass with fallback + hitbox overlay retention.
- [x] Runtime debug controls (pause/step/scale).
- [x] Recovery-window pass (no immediate move/attack chaining).
- [x] CSV authoring foundation for chips and enemy attacks.
- [x] Duplicate declaration pre-build check in CI.

## Start Here Next (Remaining M2 Work)
Implement remaining M2 scope in this order:

1. **Program Advance (PA) core implementation**
   - Add PA rule data model and detection for ordered chip sequences.
   - Resolve PA execution into single effect events in combat loop.
   - Add basic PA visibility in HUD/log for debugging.

2. **MB/cost legality checks (lighter V1 profile)**
   - Add chip MB/cost metadata to chip config.
   - Validate folder legality against current MB budget.
   - Surface legality status/errors in UI for balancing checks.

3. **Effect grammar executor expansion (after baseline hit checks)**
   - Expand from current melee/hitscan checks to actual grammar-driven execution:
     - `throw:offsets=...`
     - `step:offset=...` + follow-up effect chaining
     - multi-row/multi-tile fan patterns with consistent separators
   - Keep CSV as source-of-truth; avoid hardcoded effect behavior in store.

4. **Data pipeline hardening for CSV workflow**
   - Add validation/warnings for malformed CSV rows/effects grammar.
   - Add clear fallback behavior when a row is invalid (skip row + log).
   - Consider adding tiny tests for parser/catalog loaders.

5. **Stability pass on runtime behavior**
   - Verify manual/semi/full mode transitions do not desync queued chip state.
   - Verify AI movement + chip logic remain deterministic across long runs.
   - Keep `gameStore.ts` free of duplicate helper blocks (guard script + review).

## Acceptance Targets for Remaining M2
- At least one PA can be triggered and logged from legal chip sequence.
- Folder legality rejects illegal MB/cost configurations.
- CSV grammar supports more than simple melee/hitscan checks (throw/step baseline).
- Manual/semi/full control modes remain playable with no runtime build regressions.

## Known Follow-ups / Operational Notes
- Local font wiring is now `@font-face`-based; ensure one actual font file is committed:
  - `public/fonts/jersey-10/Jersey10-Regular.woff2` (preferred)
  - or `public/fonts/jersey-10/Jersey10-Regular.ttf`
- Build currently succeeds even when the font file is missing, but emits runtime-resolve warnings.

## Files to Extend First
- `src/features/simulation/store/gameStore.ts`
- `src/features/chips/data/chips.csv`
- `src/features/enemies/data/enemy-attacks.csv`
- `src/features/chips/chipCatalog.ts`
- `src/features/enemies/enemyAttackCatalog.ts`
- `src/app/App.tsx`

## Notes for New Thread
- Run checks before opening PR:
  - `npm run check:game-store-duplicates`
  - `npm run build`
- Keep docs in sync after each meaningful milestone:
  - `docs/M1_HANDOFF.md` (active handoff state)
  - `V1_PRODUCT_PLAN.md` (roadmap/source-of-truth)
