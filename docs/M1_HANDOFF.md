# Active Handoff Notes (M3)

This file captures the current implementation state and exact next work for a new thread.

## Current State (post-M2, active M3)
- M0 foundation/deployment pass is in place (Vite + React + TypeScript + Zustand + Pages workflow).
- CSV data pipeline hardening pass complete (row validation, grammar validation, skip+warn fallback, parser/loader tests).
- M1 Combat Vertical Slice is complete.
- M2 implementation is complete and includes:
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
  - Queued chip-slot sanitization across mode switches and post-refill hand mutation.
  - Deterministic deck/discard reshuffle seeding baseline for stability checks.
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

## Immediate Priority (Next Thread)
- Product-owner direction has shifted to **FireMan boss implementation** as the next active workstream.
- Start next thread by syncing latest `main` and pulling the newly uploaded FireMan sprite assets before coding boss logic.
- Build triage note has been retired after resolution; open a fresh incident note only if a new build regression appears.

## Start Here Next
- ✅ M2 effect grammar executor expansion complete (`throw`, `step` chaining, and row/fan pattern execution from CSV grammar).
- ✅ M3 Task 1 complete: baseline 10-wave level FSM now drives in-battle wave progression.
- ✅ Added post-wave Result popup (DeleteTime, Busting LV, RNG rewards) and 1-second `BATTLE START` banner gating next-wave unpause.
- ✅ Wave scaling now increases per-wave virus count (simultaneous board-compatible spawns) and power, capped at 6 viruses per wave (Wave 2 >=2 viruses, Wave 4 >=3 viruses).
- ✅ M3 Task 2 complete: wave-10 boss loss now returns player to wave 9 with always-available retry flow.
- ✅ Added debug controls for wave progression: `Jump to Wave 10 (Debug)` and `Retry Boss (Wave 10)` from wave 9.
- Next implementation order (updated):
  1. FireMan boss implementation pass (integrate uploaded sprites from latest `main`)
  2. Area map UI + unlock gates
  3. Shop + gacha + basic folder management

## M2 Completion Checklist
1. **Effect grammar executor expansion (after baseline hit checks)** ✅ complete
   - Added grammar-driven execution for `throw:offsets=...`.
   - Added sequential `step:offset=...` processing with follow-up effect chaining.
   - Added consistent multi-row/multi-tile fan handling for hitscan patterns.
   - CSV remains source-of-truth (no chip-specific hardcoded effect logic).

2. **Data pipeline hardening for CSV workflow** ✅ complete
   - Validation/warnings added for malformed CSV rows/effects grammar.
   - Safe fallback behavior added (invalid row skipped + warning log).
   - Parser/catalog loader tests added.

3. **Stability pass on runtime behavior** ✅ complete
   - ✅ Queue-slot desync guard added for mode switches and draw/refill mutation paths.
   - ✅ AI movement + chip logic determinism baseline verified via deterministic reshuffle utility tests and long-run replay coverage.
   - ✅ `gameStore.ts` duplicate helper guard remains active in CI (`check:game-store-duplicates`).

## M2 Acceptance Targets
- ✅ CSV grammar supports more than simple melee/hitscan checks (throw/step baseline).
- ✅ Manual/semi/full control modes remain playable with no runtime build regressions.
- ✅ Chip CSV pipeline flags malformed MB/effect rows with safe fallback behavior.

## M3 Runtime QA Focus (Next Thread)
- Re-verify active-attacker-only hitbox highlight behavior during simultaneous multi-virus waves (regression guard after boss integration).
- Re-verify no-overlap enemy movement rule under contention (first mover occupies tile, later movers stay in previous tile).
- Re-verify independent per-virus AI timers continue to resolve deterministically across long-run simulation.
- Verify wave-10 failure path: boss loss -> wave 9 fallback -> `Retry Boss (Wave 10)` starts a fresh boss attempt with clean combat state.

## Known Follow-ups / Operational Notes
- Local font wiring is now `@font-face`-based; ensure one actual font file is committed:
  - `public/fonts/jersey-10/Jersey10-Regular.woff2` (preferred)
  - or `public/fonts/jersey-10/Jersey10-Regular.ttf`
- Build currently succeeds even when the font file is missing, but emits runtime-resolve warnings.
- FireMan sprite assets were uploaded to latest `main`; next thread should sync assets first and keep naming/path conventions aligned with sprite production notes.
- Recent combat/runtime updates landed in this branch:
  - Active-attacker-only enemy hitbox highlighting and telegraph/attack gating.
  - Mutually exclusive wave rewards (`zenny` XOR `chip`) with result UI reflecting only awarded type.
  - Wave-10 boss retry flow + debug jump-to-wave-10 control.

## Files to Extend First (Next Thread: FireMan + progression)
- `src/features/simulation/store/gameStore.ts`
- `src/app/App.tsx`
- `src/features/enemies/data/enemy-attacks.csv`
- `public/sprites/fireman/` (latest assets from `main`)
- `src/features/world/` (area/wave FSM + unlock state modules)
- `src/features/progression/` (wave progression + boss retry state modules)
- `src/features/economy/` (shop/gacha modules after wave/map flow)

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
11. FireMan sprite asset paths in `public/sprites/fireman/` from latest `main`

If schema changes are made (CSV columns/grammar), update the relevant data README in the same PR.

## Notes for New Thread
- Optional batch helper for handoff prep/read-pack output: `npm run handoff:thread`
- Run checks before opening PR:
  - `npm run check:game-store-duplicates`
  - `npm run build`
- Keep docs in sync after each meaningful milestone:
  - `docs/M1_HANDOFF.md` (active handoff state)
  - `V1_PRODUCT_PLAN.md` (roadmap/source-of-truth)
