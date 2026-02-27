# Idle Network — Game Design Document (GDD)

## 1. Game Vision
Idle Network is a Mega Man Battle Network-inspired web idle RPG where combat runs automatically by default, but the player can intervene for tactical moments. The game preserves BN combat identity (3x6 grid, chips, gauge, PA, panel tactics) while adding idle-friendly progression loops.

## 2. Core Fantasy
- Build a smarter/stronger chip folder over time.
- Farm progressively harder network areas.
- Optimize auto-play while stepping in manually for clutch boss clears.
- Defeat iconic bosses, beginning with FireMan.EXE.

## 3. Target Experience
- **Moment-to-moment:** readable, satisfying BN-style action.
- **Session-to-session:** clear growth through chips, Zenny, and area unlocks.
- **Play style:** mostly chill with optional tactical control spikes.

## 4. Core Gameplay Loop
1. Select area from network map.
2. Run waves and collect rewards.
3. Every 10th wave is a boss gate.
4. If boss fails, return to wave 9 and farm until ready.
5. Trigger boss retry manually anytime.
6. Clear levels/areas, unlock next area with boss clear + Zenny.
7. Improve folder via drops, shop, and light gacha.

## 5. V1 Progression Structure
- **Area count:** 3
- **Area names (V1):** ACDC Area 1, ACDC Area 2, ACDC Area 3
- **Levels per area:** 1 -> 2 -> 3
- **Waves per level:** 10
- **Boss wave:** wave 10
- **Final boss:** FireMan.EXE in Area 3
- **Area boss policy (V1):** ACDC Area 1/2 bosses are strong virus encounters (non-Navi); Area 3 ends with FireMan.EXE
- **Area full-clear rule:** all levels and all waves in that area beaten at least once

## 6. Combat Design (V1)
### Battlefield
- 3x6 panel grid
- Area control/ownership shifts supported

### Control Modes
- Auto mode is default
- Manual movement/chip usage can override auto
- Keyboard-first inputs

### Core Battle Systems
- Custom Gauge and chip selection
- Program Advances
- Charge Shot/Buster stat baseline
- Status effects + recovery states baseline
- Obstacle/object interactions baseline
- Barrier/Aura/Shield mechanics baseline

### Runtime Behavior
- No offline progression
- Battle simulation continues in unfocused tab/non-battle routes
- Non-battle routes use same speed setting as battle view

## 7. Meta Systems (V1)
- Folder building with lighter MB/cost constraints
- Rotating chip shop
- Light-impact gacha
- Single save slot

## 8. Content Targets (V1)
- 5+ virus families
- Distinct area spawn identity/scaling
- FireMan.EXE boss implementation
- Starter chip set target: Cannon, HiCannon, M-Cannon, Sword, WideSword, LongSword, Recover10, Recover30, Barrier, AreaGrab
- Starter code proposal: primary `A` code focus, secondary `L` support code, plus 1 flex utility slot during early balancing
- First vertical-slice enemy family: Mettaur line

## 9. Product Boundaries
### In V1
- Single-player progression experience
- Auto + manual hybrid battle

### Post-V1
- Raids
- PvP
- Full Navi Customizer
- Style/Cross/Soul/Beast systems
- Playable alternate navis

## 10. Success Criteria (V1)
- Players can complete full Area 1–3 arc and beat FireMan.EXE.
- Core loop remains engaging during repeated wave farming.
- Manual intervention feels valuable but not mandatory.
- Runtime remains stable during long background-sim sessions.

## 11. Technical Product Notes
- Stack: TypeScript + React + Vite + Zustand
- Data-driven configs for chips, encounters, area unlocks, and waves
- Deterministic simulation emphasized for testability and balancing

## 12. UI & Production Direction
- Early UI approach: functional BN-like HUD first, nostalgia-heavy styling later
- Implementation details are delegated to Technical Co-Founder unless explicitly overridden by Product Owner

## 13. Data References
- Chips: https://megaman.miraheze.org/wiki/List_of_Mega_Man_Battle_Network_6_Battle_Chips
- Enemies: https://www.therockmanexezone.com/wiki/Enemies_in_MMBN6

## 14. Balancing Principles
- Reward smart folder construction over raw grind volume.
- Keep gacha supplemental, not oppressive.
- Preserve readable boss checkpoints via wave-10 gates.
- Tune for low-friction idle flow with occasional high-attention spikes.
