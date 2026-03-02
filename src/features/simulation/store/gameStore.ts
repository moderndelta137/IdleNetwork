import { create } from 'zustand'

type Speed = 1 | 2 | 4

type EntityId = 'megaman' | 'mettaur'

type ChipId = 'cannon' | 'sword' | 'recover10' | 'barrier'

type BattleChip = {
  id: ChipId
  name: string
  code: string
}

type PanelPosition = {
  row: number
  col: number
}

type EntityState = {
  id: EntityId
  name: string
  position: PanelPosition
  alive: boolean
  hp: number
  maxHp: number
}

type OccupiedPanels = Record<string, EntityId>

type CombatSummary = {
  playerHp: number
  playerMaxHp: number
  targetId: EntityId
  targetHp: number
  targetMaxHp: number
  mettaurTelegraphTicksRemaining: number
  customGaugeTicks: number
  customGaugeMaxTicks: number
  handOpen: boolean
  chipHand: BattleChip[]
  selectedChipIndex: number | null
  barrierCharges: number
  lastEvent: string
}

type GameState = {
  ticks: number
  speed: Speed
  running: boolean
  entities: Record<EntityId, EntityState>
  occupiedPanels: OccupiedPanels
  combat: CombatSummary
  megamanBusterCooldown: number
  mettaurAttackCooldown: number
  mettaurTelegraphTicksRemaining: number
  mettaurRespawnTick: number | null
  customGaugeTicks: number
  customGaugeMaxTicks: number
  handOpen: boolean
  chipHand: BattleChip[]
  selectedChipIndex: number | null
  handCursor: number
  barrierCharges: number
  setSpeed: (speed: Speed) => void
  movePlayer: (deltaRow: number, deltaCol: number) => void
  selectChip: (index: number) => void
  useSelectedChip: () => void
  resetBattle: () => void
  start: () => () => void
}

let rafId: number | null = null
let previous = 0
let accumulator = 0

const baseTickMs = 100
const megamanBusterCadenceTicks = 10
const mettaurAttackCadenceTicks = 14
const mettaurTelegraphTicks = 4
const mettaurRespawnDelayTicks = 20
const customGaugeMaxTicks = 50
const megamanHitDamage = 8
const mettaurHitDamage = 6

const chipEffects: Record<ChipId, { damage?: number; heal?: number; barrier?: number }> = {
  cannon: { damage: 20 },
  sword: { damage: 30 },
  recover10: { heal: 10 },
  barrier: { barrier: 1 }
}

const starterFolder: BattleChip[] = [
  { id: 'cannon', name: 'Cannon', code: 'A' },
  { id: 'sword', name: 'Sword', code: 'A' },
  { id: 'recover10', name: 'Recover10', code: 'L' },
  { id: 'barrier', name: 'Barrier', code: 'L' },
  { id: 'cannon', name: 'Cannon', code: 'B' },
  { id: 'sword', name: 'Sword', code: 'B' },
  { id: 'recover10', name: 'Recover10', code: 'A' },
  { id: 'barrier', name: 'Barrier', code: '*' }
]

const createInitialEntities = (): Record<EntityId, EntityState> => ({
  megaman: {
    id: 'megaman',
    name: 'MegaMan.EXE',
    position: { row: 1, col: 1 },
    alive: true,
    hp: 120,
    maxHp: 120
  },
  mettaur: {
    id: 'mettaur',
    name: 'Mettaur',
    position: { row: 1, col: 4 },
    alive: true,
    hp: 90,
    maxHp: 90
  }
})

const drawChipHand = (cursor: number, handSize = 5): BattleChip[] => {
  return Array.from({ length: handSize }).map((_, index) => starterFolder[(cursor + index) % starterFolder.length])
}

const makePanelKey = (position: PanelPosition) => `${position.row}-${position.col}`

const buildOccupiedPanels = (entities: Record<EntityId, EntityState>): OccupiedPanels => {
  const occupancy: OccupiedPanels = {}

  Object.values(entities).forEach((entity) => {
    if (entity.alive) {
      occupancy[makePanelKey(entity.position)] = entity.id
    }
  })

  return occupancy
}

const buildCombatSummary = (
  entities: Record<EntityId, EntityState>,
  runtime: Pick<
    GameState,
    | 'mettaurTelegraphTicksRemaining'
    | 'customGaugeTicks'
    | 'customGaugeMaxTicks'
    | 'handOpen'
    | 'chipHand'
    | 'selectedChipIndex'
    | 'barrierCharges'
  >,
  lastEvent: string
): CombatSummary => {
  const player = entities.megaman
  const target = entities.mettaur

  return {
    playerHp: player.hp,
    playerMaxHp: player.maxHp,
    targetId: target.id,
    targetHp: target.hp,
    targetMaxHp: target.maxHp,
    mettaurTelegraphTicksRemaining: runtime.mettaurTelegraphTicksRemaining,
    customGaugeTicks: runtime.customGaugeTicks,
    customGaugeMaxTicks: runtime.customGaugeMaxTicks,
    handOpen: runtime.handOpen,
    chipHand: runtime.chipHand,
    selectedChipIndex: runtime.selectedChipIndex,
    barrierCharges: runtime.barrierCharges,
    lastEvent
  }
}

const applyDamage = (
  source: EntityState,
  target: EntityState,
  damage: number
): { source: EntityState; target: EntityState; didHit: boolean } => {
  if (!source.alive || !target.alive) {
    return { source, target, didHit: false }
  }

  const nextHp = Math.max(0, target.hp - damage)

  return {
    source,
    target: {
      ...target,
      hp: nextHp,
      alive: nextHp > 0
    },
    didHit: true
  }
}

const inPlayerArea = (position: PanelPosition) => position.row >= 0 && position.row < 3 && position.col >= 0 && position.col < 3

type RuntimeState = Pick<
  GameState,
  | 'ticks'
  | 'entities'
  | 'occupiedPanels'
  | 'combat'
  | 'megamanBusterCooldown'
  | 'mettaurAttackCooldown'
  | 'mettaurTelegraphTicksRemaining'
  | 'mettaurRespawnTick'
  | 'customGaugeTicks'
  | 'customGaugeMaxTicks'
  | 'handOpen'
  | 'chipHand'
  | 'selectedChipIndex'
  | 'handCursor'
  | 'barrierCharges'
>

const buildInitialState = (): RuntimeState => {
  const entities = createInitialEntities()
  const runtime: Omit<RuntimeState, 'ticks' | 'entities' | 'occupiedPanels' | 'combat'> = {
    megamanBusterCooldown: megamanBusterCadenceTicks,
    mettaurAttackCooldown: mettaurAttackCadenceTicks,
    mettaurTelegraphTicksRemaining: 0,
    mettaurRespawnTick: null,
    customGaugeTicks: 0,
    customGaugeMaxTicks,
    handOpen: false,
    chipHand: [],
    selectedChipIndex: null,
    handCursor: 0,
    barrierCharges: 0
  }

  return {
    ticks: 0,
    entities,
    occupiedPanels: buildOccupiedPanels(entities),
    ...runtime,
    combat: buildCombatSummary(entities, runtime, 'Combat initialized')
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  ...buildInitialState(),
  speed: 1,
  running: false,
  setSpeed: (speed) => set({ speed }),
  movePlayer: (deltaRow, deltaCol) => {
    set((current) => {
      const player = current.entities.megaman
      if (!player.alive) {
        return {}
      }

      const targetPosition: PanelPosition = {
        row: player.position.row + deltaRow,
        col: player.position.col + deltaCol
      }

      if (!inPlayerArea(targetPosition)) {
        return {}
      }

      const nextEntities = { ...current.entities }
      const occupiedPanels = buildOccupiedPanels(nextEntities)
      const occupiedBy = occupiedPanels[makePanelKey(targetPosition)]

      if (occupiedBy && occupiedBy !== 'megaman') {
        return {}
      }

      nextEntities.megaman = {
        ...player,
        position: targetPosition
      }

      const runtime = {
        mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        handOpen: current.handOpen,
        chipHand: current.chipHand,
        selectedChipIndex: current.selectedChipIndex,
        barrierCharges: current.barrierCharges
      }

      return {
        entities: nextEntities,
        occupiedPanels: buildOccupiedPanels(nextEntities),
        combat: buildCombatSummary(nextEntities, runtime, 'MegaMan moved')
      }
    })
  },
  selectChip: (index) => {
    set((current) => {
      if (!current.handOpen || index < 0 || index >= current.chipHand.length) {
        return {}
      }

      const runtime = {
        mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        handOpen: current.handOpen,
        chipHand: current.chipHand,
        selectedChipIndex: index,
        barrierCharges: current.barrierCharges
      }

      return {
        selectedChipIndex: index,
        combat: buildCombatSummary(current.entities, runtime, `Selected chip: ${current.chipHand[index].name}`)
      }
    })
  },
  useSelectedChip: () => {
    set((current) => {
      if (!current.handOpen || current.selectedChipIndex === null) {
        return {}
      }

      const selectedChip = current.chipHand[current.selectedChipIndex]
      if (!selectedChip) {
        return {}
      }

      const effects = chipEffects[selectedChip.id]
      let nextEntities = { ...current.entities }
      let barrierCharges = current.barrierCharges
      let lastEvent = `Chip used: ${selectedChip.name} ${selectedChip.code}`

      if (effects.damage) {
        const result = applyDamage(nextEntities.megaman, nextEntities.mettaur, effects.damage)
        nextEntities = {
          ...nextEntities,
          megaman: result.source,
          mettaur: result.target
        }
        if (result.didHit) {
          lastEvent = `${selectedChip.name} hit for ${effects.damage}`
        }
      }

      if (effects.heal) {
        const nextHp = Math.min(nextEntities.megaman.maxHp, nextEntities.megaman.hp + effects.heal)
        const healedAmount = nextHp - nextEntities.megaman.hp
        nextEntities = {
          ...nextEntities,
          megaman: {
            ...nextEntities.megaman,
            hp: nextHp,
            alive: nextHp > 0
          }
        }
        lastEvent = `${selectedChip.name} healed ${healedAmount}`
      }

      if (effects.barrier) {
        barrierCharges = effects.barrier
        lastEvent = `${selectedChip.name} barrier ready`
      }

      const runtime = {
        mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
        customGaugeTicks: 0,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        handOpen: false,
        chipHand: [] as BattleChip[],
        selectedChipIndex: null,
        barrierCharges
      }

      return {
        entities: nextEntities,
        occupiedPanels: buildOccupiedPanels(nextEntities),
        customGaugeTicks: 0,
        handOpen: false,
        chipHand: [],
        selectedChipIndex: null,
        barrierCharges,
        combat: buildCombatSummary(nextEntities, runtime, lastEvent)
      }
    })
  },
  resetBattle: () => {
    set((current) => {
      const next = buildInitialState()
      return {
        ...next,
        speed: current.speed,
        running: current.running
      }
    })
  },
  start: () => {
    if (get().running) {
      return () => undefined
    }

    set({ running: true })
    previous = performance.now()

    const step = (now: number) => {
      const state = get()
      const delta = now - previous
      previous = now

      accumulator += delta * state.speed

      while (accumulator >= baseTickMs) {
        accumulator -= baseTickMs
        set((current) => {
          const nextTicks = current.ticks + 1
          let nextEntities = { ...current.entities }
          let megamanBusterCooldown = Math.max(0, current.megamanBusterCooldown - 1)
          let mettaurAttackCooldown = Math.max(0, current.mettaurAttackCooldown - 1)
          let mettaurTelegraphTicksRemaining = current.mettaurTelegraphTicksRemaining
          let mettaurRespawnTick = current.mettaurRespawnTick
          let gaugeTicks = current.customGaugeTicks
          let handOpen = current.handOpen
          let chipHand = current.chipHand
          let selectedChipIndex = current.selectedChipIndex
          let handCursor = current.handCursor
          let barrierCharges = current.barrierCharges
          let lastEvent = 'Idle tick'

          if (!handOpen) {
            gaugeTicks = Math.min(current.customGaugeMaxTicks, gaugeTicks + 1)
            if (gaugeTicks === current.customGaugeMaxTicks) {
              handOpen = true
              chipHand = drawChipHand(handCursor)
              selectedChipIndex = chipHand.length > 0 ? 0 : null
              handCursor += chipHand.length
              lastEvent = 'Custom Gauge full. Select a chip (1-5) and press Enter.'
            }
          }

          if (!nextEntities.mettaur.alive && mettaurRespawnTick === null) {
            mettaurRespawnTick = nextTicks + mettaurRespawnDelayTicks
            lastEvent = `Mettaur KO. Respawn in ${mettaurRespawnDelayTicks} ticks`
          }

          if (mettaurRespawnTick !== null && nextTicks >= mettaurRespawnTick) {
            nextEntities.mettaur = {
              ...nextEntities.mettaur,
              hp: nextEntities.mettaur.maxHp,
              alive: true,
              position: { row: 1, col: 4 }
            }
            mettaurRespawnTick = null
            mettaurAttackCooldown = mettaurAttackCadenceTicks
            mettaurTelegraphTicksRemaining = 0
            lastEvent = 'Mettaur respawned'
          }

          if (megamanBusterCooldown === 0) {
            const result = applyDamage(nextEntities.megaman, nextEntities.mettaur, megamanHitDamage)
            nextEntities = {
              ...nextEntities,
              megaman: result.source,
              mettaur: result.target
            }
            megamanBusterCooldown = megamanBusterCadenceTicks
            if (result.didHit) {
              lastEvent = `MegaBuster hit for ${megamanHitDamage}`
            }
          }

          if (nextEntities.mettaur.alive && nextEntities.megaman.alive) {
            if (mettaurTelegraphTicksRemaining > 0) {
              mettaurTelegraphTicksRemaining -= 1

              if (mettaurTelegraphTicksRemaining === 0) {
                if (barrierCharges > 0) {
                  barrierCharges -= 1
                  lastEvent = 'Barrier blocked Mettaur attack'
                } else {
                  const result = applyDamage(nextEntities.mettaur, nextEntities.megaman, mettaurHitDamage)
                  nextEntities = {
                    ...nextEntities,
                    mettaur: result.source,
                    megaman: result.target
                  }
                  if (result.didHit) {
                    lastEvent = `Mettaur swing hit for ${mettaurHitDamage}`
                  }
                }
              }
            } else if (mettaurAttackCooldown === 0) {
              mettaurTelegraphTicksRemaining = mettaurTelegraphTicks
              mettaurAttackCooldown = mettaurAttackCadenceTicks
              lastEvent = `Mettaur telegraph (${mettaurTelegraphTicks} ticks)`
            }
          } else {
            mettaurTelegraphTicksRemaining = 0
          }

          const occupiedPanels = buildOccupiedPanels(nextEntities)
          const runtime = {
            mettaurTelegraphTicksRemaining,
            customGaugeTicks: gaugeTicks,
            customGaugeMaxTicks: current.customGaugeMaxTicks,
            handOpen,
            chipHand,
            selectedChipIndex,
            barrierCharges
          }

          return {
            ticks: nextTicks,
            entities: nextEntities,
            occupiedPanels,
            combat: buildCombatSummary(nextEntities, runtime, lastEvent),
            megamanBusterCooldown,
            mettaurAttackCooldown,
            mettaurTelegraphTicksRemaining,
            mettaurRespawnTick,
            customGaugeTicks: gaugeTicks,
            handOpen,
            chipHand,
            selectedChipIndex,
            handCursor,
            barrierCharges
          }
        })
      }

      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      rafId = null
      accumulator = 0
      set({ running: false })
    }
  }
}))
