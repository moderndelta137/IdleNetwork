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
  chipHand: Array<BattleChip | null>
  barrierCharges: number
  megamanHitstunTicks: number
  queuedChipSlot: number | null
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
  chipHandSize: number
  chipHand: Array<BattleChip | null>
  chipDeck: BattleChip[]
  chipDiscard: BattleChip[]
  queuedChipSlot: number | null
  barrierCharges: number
  megamanHitstunTicks: number
  setSpeed: (speed: Speed) => void
  movePlayer: (deltaRow: number, deltaCol: number) => void
  useChipSlot: (index: number) => void
  useLeftmostChip: () => void
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
const defaultChipHandSize = 5
const megamanHitDamage = 8
const mettaurHitDamage = 6
const megamanHitstunTicksOnHit = 6

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

const shuffleChips = (chips: BattleChip[]): BattleChip[] => {
  const shuffled = [...chips]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }
  return shuffled
}

const fillHandSlots = (
  hand: Array<BattleChip | null>,
  deck: BattleChip[],
  discard: BattleChip[]
): { chipHand: Array<BattleChip | null>; chipDeck: BattleChip[]; chipDiscard: BattleChip[] } => {
  const nextHand = [...hand]
  let nextDeck = [...deck]
  let nextDiscard = [...discard]

  for (let slot = 0; slot < nextHand.length; slot += 1) {
    if (nextHand[slot]) {
      continue
    }

    if (nextDeck.length === 0 && nextDiscard.length > 0) {
      nextDeck = shuffleChips(nextDiscard)
      nextDiscard = []
    }

    if (nextDeck.length === 0) {
      break
    }

    const nextChip = nextDeck.shift() ?? null
    nextHand[slot] = nextChip
  }

  return {
    chipHand: nextHand,
    chipDeck: nextDeck,
    chipDiscard: nextDiscard
  }
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
    | 'chipHand'
    | 'barrierCharges'
    | 'megamanHitstunTicks'
    | 'queuedChipSlot'
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
    chipHand: runtime.chipHand,
    barrierCharges: runtime.barrierCharges,
    megamanHitstunTicks: runtime.megamanHitstunTicks,
    queuedChipSlot: runtime.queuedChipSlot,
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

const tryUseChipFromSlot = (
  current: Pick<GameState, 'chipHand' | 'chipDiscard' | 'entities' | 'barrierCharges'>,
  slot: number
): {
  entities: Record<EntityId, EntityState>
  chipHand: Array<BattleChip | null>
  chipDiscard: BattleChip[]
  barrierCharges: number
  lastEvent: string
  used: boolean
} => {
  const chip = current.chipHand[slot]
  if (!chip) {
    return {
      entities: current.entities,
      chipHand: current.chipHand,
      chipDiscard: current.chipDiscard,
      barrierCharges: current.barrierCharges,
      lastEvent: 'Selected chip slot is empty',
      used: false
    }
  }

  const effects = chipEffects[chip.id]
  let nextEntities = { ...current.entities }
  let barrierCharges = current.barrierCharges
  let lastEvent = `Chip used: ${chip.name} ${chip.code}`

  if (effects.damage) {
    const result = applyDamage(nextEntities.megaman, nextEntities.mettaur, effects.damage)
    nextEntities = {
      ...nextEntities,
      megaman: result.source,
      mettaur: result.target
    }
    if (result.didHit) {
      lastEvent = `${chip.name} hit for ${effects.damage}`
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
    lastEvent = `${chip.name} healed ${healedAmount}`
  }

  if (effects.barrier) {
    barrierCharges = effects.barrier
    lastEvent = `${chip.name} barrier ready`
  }

  const nextHand = [...current.chipHand]
  nextHand[slot] = null

  return {
    entities: nextEntities,
    chipHand: nextHand,
    chipDiscard: [...current.chipDiscard, chip],
    barrierCharges,
    lastEvent,
    used: true
  }
}

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
  | 'chipHandSize'
  | 'chipHand'
  | 'chipDeck'
  | 'chipDiscard'
  | 'queuedChipSlot'
  | 'barrierCharges'
  | 'megamanHitstunTicks'
>

const buildInitialState = (): RuntimeState => {
  const entities = createInitialEntities()
  const initialDeck = shuffleChips(starterFolder)
  const initialHand = Array.from({ length: defaultChipHandSize }, () => null as BattleChip | null)
  const firstFill = fillHandSlots(initialHand, initialDeck, [])

  const runtime: Omit<RuntimeState, 'ticks' | 'entities' | 'occupiedPanels' | 'combat'> = {
    megamanBusterCooldown: megamanBusterCadenceTicks,
    mettaurAttackCooldown: mettaurAttackCadenceTicks,
    mettaurTelegraphTicksRemaining: 0,
    mettaurRespawnTick: null,
    customGaugeTicks: 0,
    customGaugeMaxTicks,
    chipHandSize: defaultChipHandSize,
    chipHand: firstFill.chipHand,
    chipDeck: firstFill.chipDeck,
    chipDiscard: firstFill.chipDiscard,
    queuedChipSlot: null,
    barrierCharges: 0,
    megamanHitstunTicks: 0
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
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: current.queuedChipSlot
      }

      return {
        entities: nextEntities,
        occupiedPanels: buildOccupiedPanels(nextEntities),
        combat: buildCombatSummary(nextEntities, runtime, 'MegaMan moved')
      }
    })
  },
  useChipSlot: (index) => {
    set((current) => {
      if (index < 0 || index >= current.chipHand.length) {
        return {}
      }

      const megamanBusy = !current.entities.megaman.alive || current.megamanHitstunTicks > 0

      if (megamanBusy) {
        const runtime = {
          mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
          customGaugeTicks: current.customGaugeTicks,
          customGaugeMaxTicks: current.customGaugeMaxTicks,
          chipHand: current.chipHand,
          barrierCharges: current.barrierCharges,
          megamanHitstunTicks: current.megamanHitstunTicks,
          queuedChipSlot: index
        }

        return {
          queuedChipSlot: index,
          combat: buildCombatSummary(current.entities, runtime, `Buffered ${current.chipHand[index]?.name ?? 'empty slot'} for next action`)
        }
      }

      const result = tryUseChipFromSlot(current, index)
      if (!result.used) {
        const runtime = {
          mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
          customGaugeTicks: current.customGaugeTicks,
          customGaugeMaxTicks: current.customGaugeMaxTicks,
          chipHand: current.chipHand,
          barrierCharges: current.barrierCharges,
          megamanHitstunTicks: current.megamanHitstunTicks,
          queuedChipSlot: current.queuedChipSlot
        }

        return {
          combat: buildCombatSummary(current.entities, runtime, result.lastEvent)
        }
      }

      const runtime = {
        mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: result.chipHand,
        barrierCharges: result.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: null
      }

      return {
        entities: result.entities,
        occupiedPanels: buildOccupiedPanels(result.entities),
        chipHand: result.chipHand,
        chipDiscard: result.chipDiscard,
        barrierCharges: result.barrierCharges,
        queuedChipSlot: null,
        combat: buildCombatSummary(result.entities, runtime, result.lastEvent)
      }
    })
  },
  useLeftmostChip: () => {
    const state = get()
    const slot = state.chipHand.findIndex((chip) => chip !== null)
    if (slot >= 0) {
      state.useChipSlot(slot)
    }
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
          let gaugeTicks = current.customGaugeTicks + 1
          let chipHand = current.chipHand
          let chipDeck = current.chipDeck
          let chipDiscard = current.chipDiscard
          let queuedChipSlot = current.queuedChipSlot
          let barrierCharges = current.barrierCharges
          let megamanHitstunTicks = Math.max(0, current.megamanHitstunTicks - 1)
          let lastEvent = 'Idle tick'

          if (gaugeTicks >= current.customGaugeMaxTicks) {
            const refill = fillHandSlots(chipHand, chipDeck, chipDiscard)
            chipHand = refill.chipHand
            chipDeck = refill.chipDeck
            chipDiscard = refill.chipDiscard
            gaugeTicks = 0
            lastEvent = 'Custom Gauge full. Hand refilled from deck.'
          }

          const megamanBusy = !nextEntities.megaman.alive || megamanHitstunTicks > 0
          if (queuedChipSlot !== null && !megamanBusy) {
            const queuedUse = tryUseChipFromSlot(
              { chipHand, chipDiscard, entities: nextEntities, barrierCharges },
              queuedChipSlot
            )
            if (queuedUse.used) {
              nextEntities = queuedUse.entities
              chipHand = queuedUse.chipHand
              chipDiscard = queuedUse.chipDiscard
              barrierCharges = queuedUse.barrierCharges
              lastEvent = `Buffered chip resolved: ${queuedUse.lastEvent}`
              queuedChipSlot = null
            } else {
              queuedChipSlot = null
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
                    megamanHitstunTicks = megamanHitstunTicksOnHit
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
            chipHand,
            barrierCharges,
            megamanHitstunTicks,
            queuedChipSlot
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
            chipHand,
            chipDeck,
            chipDiscard,
            queuedChipSlot,
            barrierCharges,
            megamanHitstunTicks
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
