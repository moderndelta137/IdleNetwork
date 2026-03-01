# M1 Handoff Notes

This file captures the current implementation state and the exact next work for a new thread.

## Current State (post-M0)
- Project scaffold is in place (Vite + React + TypeScript + Zustand).
- Root page now always shows meaningful content:
  - React app when bundle boots.
  - Static fallback 3x6 board with fallback tick/speed runtime when bundle fails.
- GitHub Pages deployment path is configured and working.
- Deployment smoke test page is available at `docs/test-page.html`.

## Confirmed M0 Completion
- 3x6 board visual in app shell.
- Route-independent runtime tick store with 1x/2x/4x controls.
- Pages workflow + deployment guidance.
- Root-level fallback visibility and diagnostic links.

## Start Here for M1
Implement **Combat Vertical Slice** with this order:

1. **Entity + board occupancy model**
   - Add MegaMan + Mettaur entity records.
   - Track panel coordinates and alive/KO states.

2. **HP + damage loop**
   - Add HP fields and damage application.
   - Show HP in HUD for player and target enemy.

3. **Auto behavior (baseline)**
   - MegaMan auto buster fire at target cadence.
   - Mettaur attack cadence (simple telegraph timer + damage event).

4. **Manual movement override**
   - Keyboard movement on player-side 3x3 panels.
   - Respect panel occupancy bounds.

5. **KO + reset flow**
   - Enemy KO -> simple respawn/reset for continued testing.
   - Player KO -> test-state reset button in HUD.


## Progress Update
- [x] Task 1 complete: entity + board occupancy model (MegaMan + Mettaur with panel coordinates and alive/KO state).
- [x] Task 2 complete: HP fields, damage application over runtime ticks, and HUD HP display for player + target enemy.
- [ ] Task 3 pending: baseline auto behavior cadence polish (explicit telegraph/event structure).
- [ ] Task 4 pending: manual keyboard movement override on player-side 3x3 with occupancy bounds.
- [ ] Task 5 pending: KO/reset flow (enemy respawn + player reset button).

## M1 Acceptance Criteria
- You can see MegaMan + 1 Mettaur on the board.
- HP decreases from attacks over time.
- Player movement works with keyboard.
- At least one full combat cycle reaches KO and reset.

## Files to Extend First
- `src/features/simulation/store/gameStore.ts`
- `src/features/battle/components/Board.tsx`
- `src/app/App.tsx`

## Notes
- Keep docs in sync after each meaningful milestone:
  - `docs/M0_MILESTONE_TASKS.md` (status tracking)
  - `V1_PRODUCT_PLAN.md` (roadmap/source-of-truth)
