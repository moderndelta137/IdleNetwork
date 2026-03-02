import { create } from 'zustand'

type Speed = 1 | 2 | 4

type EntityId = 'megaman' | 'mettaur'

type ChipId = 'cannon' | 'sword' | 'recover10' | 'barrier'

type BattleChip = {
  id: ChipId
  name: string
  code: string
}

type HandSlot = BattleChip | null

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
  handSize: number
  chipHand: HandSlot[]
  barrierCharges: number
  megamanHitStunTicks: number
  queuedChipSlot: number | null
  deckCount: number
  discardCount: number
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
  handSize: number
  chipHand: HandSlot[]
  chipDeck: BattleChip[]
  chipDiscard: BattleChip[]
  barrierCharges: number
  megamanHitStunTicks: number
  queuedChipSlot: number | null
  setSpeed: (speed: Speed) => void
  movePlayer: (deltaRow: number, deltaCol: number) => void
  useChipSlot: (index: number) => void
  useLeftMostChip: () => void
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
const defaultHandSize = 5
const megamanHitDamage = 8
const mettaurHitDamage = 6
const megamanHitStunTicksOnHit = 3

const chipEffects: Record<ChipId, { damage?: number; heal?: number; barrier?: number; description: string }> = {
  cannon: { damage: 20, description: '20 dmg single shot' },
  sword: { damage: 30, description: '30 dmg close slash' },
  recover10: { heal: 10, description: 'Recover 10 HP' },
  barrier: { barrier: 1, description: 'Block 1 hit' }
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
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = temp
  }
  return shuffled
}

const drawChip = (deck: BattleChip[], discard: BattleChip[]): { chip: BattleChip | null; deck: BattleChip[]; discard: BattleChip[] } => {
  let nextDeck = [...deck]
  let nextDiscard = [...discard]

  if (nextDeck.length === 0 && nextDiscard.length > 0) {
    nextDeck = shuffleChips(nextDiscard)
    nextDiscard = []
  }

  if (nextDeck.length === 0) {
    return { chip: null, deck: nextDeck, discard: nextDiscard }
  }

  const [chip, ...rest] = nextDeck
  return {
    chip,
    deck: rest,
    discard: nextDiscard
  }
}

const refillHandSlots = (hand: HandSlot[], deck: BattleChip[], discard: BattleChip[]): { hand: HandSlot[]; deck: BattleChip[]; discard: BattleChip[] } => {
  const nextHand = [...hand]
  let nextDeck = [...deck]
  let nextDiscard = [...discard]

  for (let slot = 0; slot < nextHand.length; slot += 1) {
    if (nextHand[slot] !== null) {
      continue
    }

    const draw = drawChip(nextDeck, nextDiscard)
    nextDeck = draw.deck
    nextDiscard = draw.discard
    nextHand[slot] = draw.chip
  }

  return {
    hand: nextHand,
    deck: nextDeck,
    discard: nextDiscard
  }
}

const applyChipToState = (
  current: GameState,
  slot: number,
  nextEntities: Record<EntityId, EntityState>,
  barrierCharges: number
): {
  nextEntities: Record<EntityId, EntityState>
  barrierCharges: number
  chipHand: HandSlot[]
  chipDiscard: BattleChip[]
  lastEvent: string
} | null => {
  const selectedChip = current.chipHand[slot]
  if (!selectedChip) {
    return null
  }

  const effects = chipEffects[selectedChip.id]
  const nextHand = [...current.chipHand]
  nextHand[slot] = null
  const nextDiscard = [...current.chipDiscard, selectedChip]
  let lastEvent = `Chip used: ${selectedChip.name} ${selectedChip.code}`
  let updatedEntities = nextEntities
  let updatedBarrier = barrierCharges

  if (effects.damage) {
    const result = applyDamage(updatedEntities.megaman, updatedEntities.mettaur, effects.damage)
    updatedEntities = {
      ...updatedEntities,
      megaman: result.source,
      mettaur: result.target
    }
    if (result.didHit) {
      lastEvent = `${selectedChip.name} hit for ${effects.damage}`
    }
  }

  if (effects.heal) {
    const nextHp = Math.min(updatedEntities.megaman.maxHp, updatedEntities.megaman.hp + effects.heal)
    const healedAmount = nextHp - updatedEntities.megaman.hp
    updatedEntities = {
      ...updatedEntities,
      megaman: {
        ...updatedEntities.megaman,
        hp: nextHp,
        alive: nextHp > 0
      }
    }
    lastEvent = `${selectedChip.name} healed ${healedAmount}`
  }

  if (effects.barrier) {
    updatedBarrier = effects.barrier
    lastEvent = `${selectedChip.name} barrier ready`
  }

  return {
    nextEntities: updatedEntities,
    barrierCharges: updatedBarrier,
    chipHand: nextHand,
    chipDiscard: nextDiscard,
    lastEvent
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
    | 'handSize'
    | 'chipHand'
    | 'barrierCharges'
    | 'megamanHitStunTicks'
    | 'queuedChipSlot'
    | 'chipDeck'
    | 'chipDiscard'
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
    handSize: runtime.handSize,
    chipHand: runtime.chipHand,
    barrierCharges: runtime.barrierCharges,
    megamanHitStunTicks: runtime.megamanHitStunTicks,
    queuedChipSlot: runtime.queuedChipSlot,
    deckCount: runtime.chipDeck.length,
    discardCount: runtime.chipDiscard.length,
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
  | 'handSize'
  | 'chipHand'
  | 'chipDeck'
  | 'chipDiscard'
  | 'barrierCharges'
  | 'megamanHitStunTicks'
  | 'queuedChipSlot'
>

const buildInitialState = (): RuntimeState => {
  const entities = createInitialEntities()
  const chipDeck = shuffleChips(starterFolder)
  const initialHand = Array.from({ length: defaultHandSize }, () => null as HandSlot)
  const refill = refillHandSlots(initialHand, chipDeck, [])

  const runtime: Omit<RuntimeState, 'ticks' | 'entities' | 'occupiedPanels' | 'combat'> = {
    megamanBusterCooldown: megamanBusterCadenceTicks,
    mettaurAttackCooldown: mettaurAttackCadenceTicks,
    mettaurTelegraphTicksRemaining: 0,
    mettaurRespawnTick: null,
    customGaugeTicks: 0,
    customGaugeMaxTicks,
    handSize: defaultHandSize,
    chipHand: refill.hand,
    chipDeck: refill.deck,
    chipDiscard: refill.discard,
    barrierCharges: 0,
    megamanHitStunTicks: 0,
    queuedChipSlot: null
  }

  return {
    ticks: 0,
    entities,
    occupiedPanels: buildOccupiedPanels(entities),
    ...runtime,
    combat: buildCombatSummary(entities, runtime, 'Combat initialized')
  }
}

const buildRuntimeSnapshot = (current: GameState) => ({
  mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
  customGaugeTicks: current.customGaugeTicks,
  customGaugeMaxTicks: current.customGaugeMaxTicks,
  handSize: current.handSize,
  chipHand: current.chipHand,
  barrierCharges: current.barrierCharges,
  megamanHitStunTicks: current.megamanHitStunTicks,
  queuedChipSlot: current.queuedChipSlot,
  chipDeck: current.chipDeck,
  chipDiscard: current.chipDiscard
})

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

      return {
        entities: nextEntities,
        occupiedPanels: buildOccupiedPanels(nextEntities),
        combat: buildCombatSummary(nextEntities, buildRuntimeSnapshot(current), 'MegaMan moved')
      }
    })
  },
  useChipSlot: (index) => {
    set((current) => {
      if (index < 0 || index >= current.handSize) {
        return {}
      }

      const chip = current.chipHand[index]
      if (!chip) {
        return {
          combat: buildCombatSummary(current.entities, buildRuntimeSnapshot(current), `Slot ${index + 1} is empty`)
        }
      }

      if (current.megamanHitStunTicks > 0) {
        if (current.queuedChipSlot !== null) {
          return {
            combat: buildCombatSummary(
              current.entities,
              buildRuntimeSnapshot(current),
              `Chip queue already occupied (${current.queuedChipSlot + 1})`
            )
          }
        }

        return {
          queuedChipSlot: index,
          combat: buildCombatSummary(current.entities, { ...buildRuntimeSnapshot(current), queuedChipSlot: index }, `Queued ${chip.name}`)
        }
      }

      const applied = applyChipToState(current, index, { ...current.entities }, current.barrierCharges)
      if (!applied) {
        return {}
      }

      return {
        entities: applied.nextEntities,
        occupiedPanels: buildOccupiedPanels(applied.nextEntities),
        chipHand: applied.chipHand,
        chipDiscard: applied.chipDiscard,
        barrierCharges: applied.barrierCharges,
        combat: buildCombatSummary(
          applied.nextEntities,
          {
            ...buildRuntimeSnapshot(current),
            chipHand: applied.chipHand,
            chipDiscard: applied.chipDiscard,
            barrierCharges: applied.barrierCharges
          },
          applied.lastEvent
        )
      }
    })
  },
  useLeftMostChip: () => {
    const state = get()
    const leftMostIndex = state.chipHand.findIndex((chip) => chip !== null)
    if (leftMostIndex >= 0) {
      state.useChipSlot(leftMostIndex)
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
          let gaugeTicks = Math.min(current.customGaugeMaxTicks, current.customGaugeTicks + 1)
          let chipHand = [...current.chipHand]
          let chipDeck = [...current.chipDeck]
          let chipDiscard = [...current.chipDiscard]
          let barrierCharges = current.barrierCharges
          let megamanHitStunTicks = Math.max(0, current.megamanHitStunTicks - 1)
          let queuedChipSlot = current.queuedChipSlot
          let lastEvent = 'Idle tick'

          if (gaugeTicks === current.customGaugeMaxTicks) {
            const refill = refillHandSlots(chipHand, chipDeck, chipDiscard)
            chipHand = refill.hand
            chipDeck = refill.deck
            chipDiscard = refill.discard
            gaugeTicks = 0
            lastEvent = 'Custom Gauge full. Hand refilled.'
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
                    megamanHitStunTicks = megamanHitStunTicksOnHit
                    lastEvent = `Mettaur swing hit for ${mettaurHitDamage} (hit stun)`
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

          if (queuedChipSlot !== null && megamanHitStunTicks === 0) {
            const queuedChip = chipHand[queuedChipSlot]
            if (queuedChip) {
              const queuedState = {
                ...current,
                entities: nextEntities,
                chipHand,
                chipDiscard,
                barrierCharges
              }
              const applied = applyChipToState(queuedState, queuedChipSlot, nextEntities, barrierCharges)
              if (applied) {
                nextEntities = applied.nextEntities
                chipHand = applied.chipHand
                chipDiscard = applied.chipDiscard
                barrierCharges = applied.barrierCharges
                lastEvent = `Queued -> ${applied.lastEvent}`
              }
            }
            queuedChipSlot = null
          }

          const occupiedPanels = buildOccupiedPanels(nextEntities)
          const runtime = {
            mettaurTelegraphTicksRemaining,
            customGaugeTicks: gaugeTicks,
            customGaugeMaxTicks: current.customGaugeMaxTicks,
            handSize: current.handSize,
            chipHand,
            barrierCharges,
            megamanHitStunTicks,
            queuedChipSlot,
            chipDeck,
            chipDiscard
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
            barrierCharges,
            megamanHitStunTicks,
            queuedChipSlot
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

export const chipInfo = chipEffects
