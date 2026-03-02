# Active Handoff Notes (M2)

This file captures the current implementation state and the exact next work for a new thread.

## Current State (post-M1)
- M0 foundation/deployment pass is in place (Vite + React + TypeScript + Zustand + Pages workflow).
- M1 Combat Vertical Slice is complete.
- M2 implementation is in progress and currently includes:
  - Always-on chip hand with 5 slots.
  - Custom Gauge refill into hand slots.
  - Deck/discard reshuffle behavior when deck empties.
  - Buffered chip-use slot when MegaMan is busy.
  - MegaMan control modes: `manual`, `semiAuto`, `fullAuto`.
  - Baseline movement AI for MegaMan and Mettaur.
- CI now includes a duplicate-helper guard script for `gameStore.ts` before build.

## Confirmed Implemented in M2 So Far
- [x] Custom Gauge + chip hand flow (always-on hand model).
- [x] Manual chip usage by slot (`1-5`) and left-most quick use.
- [x] Aggressive auto-chip behavior in `fullAuto` mode.
- [x] Manual/SemiAuto/FullAuto control mode toggle for MegaMan.
- [x] Baseline AI movement loop for MegaMan + Mettaur.
- [x] Duplicate declaration pre-build check in CI.

## Sprite Integration Prep (immediate pre-PA visual pass)
Before PA core work, land a lightweight sprite render pass with no combat-logic changes:
- Add initial sprite asset folders under `public/sprites/megaman` and `public/sprites/mettaur`.
- Replace board occupant text labels with sprite rendering + text fallback.
- Keep yellow non-hitscan hitbox overlays visible for combat-range debugging.
- Start with static idle/swing frames first; animation state wiring can iterate after PA baseline.

## Start Here Next (Remaining M2 Work)
Implement the remaining M2 scope in this order:

1. **Program Advance (PA) core implementation**
   - Add PA rule data model and detection for ordered chip sequences.
   - Resolve PA execution into single effect events in combat loop.
   - Add basic PA visibility in HUD/log for debugging.

2. **MB/cost legality checks (lighter V1 profile)**
   - Add chip MB/cost metadata to chip config.
   - Validate folder legality against current MB budget.
   - Surface legality status/errors in UI for quick balancing checks.

3. **Stability pass on runtime behavior**
   - Verify manual/semi/full mode transitions do not desync queued chip state.
   - Verify AI movement + chip logic remain deterministic across long runs.
   - Keep `gameStore.ts` free of duplicate helper blocks (guard script + review).

## Acceptance Targets for Remaining M2
- At least one PA can be triggered and logged from legal chip sequence.
- Folder legality rejects illegal MB/cost configurations.
- Manual/semi/full control modes remain playable with no runtime build regressions.

## Files to Extend First
- `src/features/simulation/store/gameStore.ts`
- `src/app/App.tsx`
- (add as needed) `src/features/chips/*` for PA and legality data separation

## Notes for New Thread
- Run checks before opening PR:
  - `npm run check:game-store-duplicates`
  - `npm run build`
- Keep docs in sync after each meaningful milestone:
  - `docs/M1_HANDOFF.md` (active handoff state)
  - `V1_PRODUCT_PLAN.md` (roadmap/source-of-truth)
