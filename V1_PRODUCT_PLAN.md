# Idle Network — V1 Product Plan (Tight)

## 1) V1 Outcome
Ship a stable, polished web game where players can run BN-style battles mostly automatically, intervene manually when desired, and progress through a wave-based area map to defeat FireMan.EXE.

---

## 2) Locked Product Decisions
- Platform: Web
- Art direction: Original BN sprites (private/free usage for now)
- Combat field: Full 3x6 grid
- Control model: Auto + Manual (manual override always available)
- Progression runtime: No offline progression; battle simulation continues when tab is unfocused and while in non-battle screens
- Input priority: Keyboard-first
- Auto behavior: Aggressive by default
- Difficulty: Mostly chill idle pacing with occasional manual clutch moments
- Save model: Single slot
- Gacha role: Light progression helper

### Area/Progression Locks
- Area naming (V1): ACDC Area 1, ACDC Area 2, ACDC Area 3.
- V1 has exactly 3 areas.
- Area level counts: Area 1 = 1 level, Area 2 = 2 levels, Area 3 = 3 levels.
- Each level = 10 waves.
- Wave 10 is the boss wave.
- If wave-10 boss is lost, player returns to wave 9.
- Boss retry button is always available (no cooldown/cost).
- Area unlock requires prior area boss clear + Zenny payment.
- FireMan.EXE is the final boss of Area 3 (reusable in future versions as variant content).
- Area bosses for ACDC Area 1/2: strong virus bosses (not Navi opponents in V1).
- Full-clear definition: an area is fully cleared only after all levels and all waves are beaten at least once.

---

## 3) V1 Scope

### Core Loop
1. Pick area from map
2. Run waves and farm resources/chips
3. Beat wave-10 bosses to advance levels
4. Unlock next area with boss clear + Zenny
5. Improve folder/build via drops + gacha + shop
6. Clear Area 3 and beat FireMan.EXE

### Combat Features in V1
- 3x6 panel combat with auto movement/attacks
- Manual movement and manual chip usage override
- Custom Gauge + chip selection/use
- Program Advance detection/execution
- Area control mechanics
- Charge Shot/Buster stat tracks (baseline)
- Status effects + recovery states (baseline)
- Obstacle/object interactions (baseline)
- Barrier/Aura/Shield defensive layers (baseline)

### Economy/Build Features in V1
- Zenny rewards + chip drops
- Rotating chip shop
- Light-impact gacha
- Folder rules with lighter V1 MB/cost constraints

### Content Floor
- 5+ virus families
- Area-based spawn identity/scaling
- FireMan.EXE as final V1 boss
- ACDC Area 1/2 bosses use strong virus encounters (non-Navi), Area 3 culminates in FireMan.EXE
- Starter chip set (M2 target): Cannon, HiCannon, M-Cannon, Sword, WideSword, LongSword, Recover10, Recover30, Barrier, AreaGrab
- Starter chip code proposal (for first folder testing):
  - Primary code focus: `A` (Cannon/HiCannon/M-Cannon/Sword/WideSword/LongSword where available)
  - Support secondary code: `L` (Recover/Barrier utilities where available)
  - Utility wildcard slot policy: 1 flex slot can use any legal code during early balancing
- First fully implemented virus family for vertical slice: Mettaur line

### Explicitly Out of Scope (V1)
- Raids
- PvP
- Full Navi Customizer
- Style Change / Cross-Soul / Beast Out
- Multi-Navi playable roster

---

## 4) Technical Build Direction

### Stack
- TypeScript + React + Vite
- Zustand state management
- Stack/implementation details are delegated to Technical Co-Founder unless explicitly overridden by Product Owner

### Module Ownership
- `combat/` battle simulation loop, hit resolution, panel state
- `chips/` chip data/effects/codes/PA rules
- `ai/` auto movement and chip heuristics
- `progression/` rewards, unlock rules, wave/level advancement
- `economy/` shop/gacha tables + rotations
- `world/` area map, area metadata, level-wave state machine
- `content/` viruses, bosses, encounter definitions
- `ui/` battle HUD + map + folder + gacha/shop flows

### Data-Driven Requirements
- Area configs: unlock cost, spawn tables, levels, boss-wave definitions
- Chip configs: codes, MB/cost, effects, rarity/source
- Encounter configs: wave composition + difficulty scaling

---

## 5) Milestone Plan (Execution)

### M0 Foundation
- Project scaffold and architecture skeleton
- 3x6 board renderer with entity placement
- Route-independent simulation runtime service
- Speed controls (1x/2x/4x)

### M1 Combat Vertical Slice
- Auto buster + movement
- Manual movement override
- Damage/HP/KO loop
- First virus family end-to-end (Mettaur line)

### M2 Chips + Rules
- Custom Gauge + chip hand flow
- Manual chip use + aggressive auto-chip behavior
- Program Advance core implementation
- MB/cost legality checks (lighter V1 profile)

### M3 Area Meta Loop
- Area map UI + unlock gates
- Full 10-wave level FSM
- Wave-10 boss retry button behavior
- Shop + gacha + basic folder management

### M4 Content Pack
- Expand to 5+ virus families
- Area scaling pass
- FireMan.EXE fight implementation
- Baseline status/object/defense layer content coverage

### M5 Polish + Ship Prep
- UX and readability pass
- UI direction: functional BN-like HUD first; nostalgia-heavy styling deferred to later polish iterations
- Performance/stability pass
- Save compatibility checks
- Balance pass tuned for chill-idle + clutch moments

---

## 6) Test Plan (Minimum Required)
- Unit: PA detection, MB legality, status timing, defensive-layer resolution
- Unit: unlock rules and wave/level transitions
- Simulation: deterministic combat seeds
- Simulation: area farming/advancement economy sanity
- Simulation: background ticking consistency across routes/tab focus states
- Manual: keyboard playability + folder/shop/map UX

---

## 7) Risks to Manage Early
- Background runtime desync across routes
- Economy inflation from wave-9 fail loops
- Over-aggressive auto-chip behavior reducing manual value
- Performance on long idle sessions

Mitigation: deterministic state updates, capped reward tuning, telemetry counters, early profiling.


---

## 8) External Reference Sources (Design/Data)
- Battle Chip reference dataset: https://megaman.miraheze.org/wiki/List_of_Mega_Man_Battle_Network_6_Battle_Chips
- Enemy reference dataset: https://www.therockmanexezone.com/wiki/Enemies_in_MMBN6
- These sources are reference-only for design/data drafting; implementation remains original project code.
