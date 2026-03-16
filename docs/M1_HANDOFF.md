# Active Handoff Notes (M3)

This file captures the current implementation state and recommended next work for a new thread.

## Current State
- M0 foundation/deployment is in place (Vite + React + TypeScript + Zustand + Pages workflow).
- CSV data pipeline hardening is complete (validation, skip+warn fallback, parser/loader tests).
- M1 combat vertical slice is complete.
- M2 combat/chip systems are complete (always-on hand, gauge flow, PA, MB legality checks, control modes, AI baseline, sprite rendering, debug controls, deterministic reshuffle guardrails).
- M3 progression systems are now partially complete:
  - 10-wave progression FSM and boss gating.
  - Wave result modal (DeleteTime/BustingLV/rewards).
  - Area Map scene with area selection + unlock highlight flow.
  - Infinite-wave mode and boss challenge from infinite.
  - FireMan enemy integration and projectile grammar/runtime support.
  - NetDealer economy scenes: Chip Trader and Higsby's Shop.

## Recently Completed Fixes
- Boss clear transition behavior is now consistent across scenarios:
  - First-time boss clear shows the result screen before transitioning to Area Map.
  - Re-clearing an already-unlocked boss also shows the result screen before returning to Wave ∞.
  - Boss challenges launched from Wave ∞ show the result screen before resuming Wave ∞.
- Economy tuning pass landed:
  - Weighted gacha pulls by MB tier (common chips appear more often, higher-MB chips are rarer).
  - 10-pull quality floor (ensures at least one mid/high-MB chip in a 10-pull result set).
  - 10-pull pricing value pass in Chip Trader.
  - Higsby pricing now uses explicit MB-tiered pricing.

## Immediate Priority (Next Thread)
1. M3 runtime QA pass on progression transitions and map UX after recent economy changes.
2. Validate/tune weighted gacha + 10-pull guarantee using telemetry-like sample runs.
3. Expand shop/gacha depth further (rarity presentation, inventory rotation variety, pity messaging).
4. Additional combat/content expansion after economy + transition QA baseline is stable.

## Runtime QA Focus
- Re-verify result-modal timing and transitions for all boss outcomes:
  - first-time clear,
  - repeat clear,
  - Wave ∞ boss challenge clear,
  - boss loss and retry path.
- Re-verify multi-virus telegraph/highlight behavior during multi-virus waves.
- Re-verify deterministic behavior under long-run simulation (movement contention + independent AI timers).
- Re-verify economy loop edge-cases:
  - low-zenny disabled states,
  - x10 guarantee behavior,
  - shop rotation offer variety and pricing readability.

## Latest Re-Validation Snapshot
- Re-checked M3 progression/map/economy flows after weighted-gacha tuning pass.
- Confirmed no regression in baseline checks (`check:game-store-duplicates`, node tests, build).
- Current recommendation remains: focus next thread on transition-path QA matrix + economy telemetry tuning.

## Known Operational Notes
- Duplicate-helper guard script remains required before build:
  - `npm run check:game-store-duplicates`
- Test check:
  - `node --test tests/*.test.mjs`
- Build check:
  - `npm run build`
- Local font file note:
  - `public/fonts/jersey-10/Jersey10-Regular.woff2` preferred.
  - Missing font file can cause runtime-resolve warnings during build.

## Primary Files for Ongoing M3 Work
- `src/features/simulation/store/gameStore.ts`
- `src/app/App.tsx`
- `src/features/world/components/AreaMapScene.tsx`
- `src/features/world/components/ChipTraderScene.tsx`
- `src/features/world/components/HigsbyShopScene.tsx`
- `src/shared/styles/global.css`

## Read Order for New Thread
1. `docs/M1_HANDOFF.md`
2. `V1_PRODUCT_PLAN.md`
3. `GDD.md`
4. `AGENT.md`
5. `src/features/chips/data/chips.csv`
6. `src/features/chips/data/effect-grammar.csv`
7. `src/features/chips/data/README.md`
8. `src/features/enemies/data/enemy-attacks.csv`
9. `src/features/enemies/data/README.md`
10. `public/fonts/jersey-10/README.md`

If schema changes are made (CSV columns/grammar), update the relevant data README in the same PR.
