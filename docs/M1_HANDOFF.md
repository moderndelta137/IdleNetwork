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
  - Program Advance (PA) auto-form from hand on Custom Gauge refill, including merge animation, PA chip replacement, and debug force-next-draw control.
  - Explicit chip MB metadata in `chips.csv` and MB-driven folder legality checks in store/UI (temporary cap: 40).
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
- [x] Program Advance core (auto-form on legal in-hand recipe, merge animation, single PA chip execution).
- [x] MB/cost legality checks baseline (chip MB metadata + deck MB cap enforcement + UI status).
- [x] Duplicate declaration pre-build check in CI.

## Start Here Next (Remaining M2 Work)
Implement remaining M2 scope in this order:

1. **Effect grammar executor expansion (after baseline hit checks)**
   - Expand from current melee/hitscan checks to actual grammar-driven execution:
     - `throw:offsets=...`
     - `step:offset=...` + follow-up effect chaining
     - multi-row/multi-tile fan patterns with consistent separators
   - Keep CSV as source-of-truth; avoid hardcoded effect behavior in store.

2. **Data pipeline hardening for CSV workflow**
   - Add validation/warnings for malformed CSV rows/effects grammar.
   - Add clear fallback behavior when a row is invalid (skip row + log).
   - Consider adding tiny tests for parser/catalog loaders.

3. **Stability pass on runtime behavior**
   - Verify manual/semi/full mode transitions do not desync queued chip state.
   - Verify AI movement + chip logic remain deterministic across long runs.
   - Keep `gameStore.ts` free of duplicate helper blocks (guard script + review).

## Acceptance Targets for Remaining M2
- CSV grammar supports more than simple melee/hitscan checks (throw/step baseline).
- Manual/semi/full control modes remain playable with no runtime build regressions.
- Chip CSV pipeline flags malformed MB/effect rows with safe fallback behavior.

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

## New Thread Read Order (Carry-Over Pack)
Before coding in a new thread, read these in order:
1. `docs/M1_HANDOFF.md` (this file; exact implementation state + next tasks)
2. `V1_PRODUCT_PLAN.md` (locked scope and milestone alignment)
3. `GDD.md` (design intent and gameplay-system context)
4. `AGENT.md` (working model + communication expectations)
5. `src/features/chips/data/chips.csv`
6. `src/features/chips/data/effect-grammar.csv`
7. `src/features/chips/data/README.md`
8. `src/features/enemies/data/enemy-attacks.csv`
9. `src/features/enemies/data/README.md`
10. `public/fonts/jersey-10/README.md` (runtime asset note)

If schema changes are made (CSV columns/grammar), update the relevant data README in the same PR.

## Notes for New Thread
- Run checks before opening PR:
  - `npm run check:game-store-duplicates`
  - `npm run build`
- Keep docs in sync after each meaningful milestone:
  - `docs/M1_HANDOFF.md` (active handoff state)
  - `V1_PRODUCT_PLAN.md` (roadmap/source-of-truth)
