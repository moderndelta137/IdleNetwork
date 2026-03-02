import { create } from 'zustand'

type Speed = 1 | 2 | 4
type MegamanControlMode = 'manual' | 'semiAuto' | 'fullAuto'

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
  megamanControlMode: MegamanControlMode
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
  autoChipCooldown: number
  megamanControlMode: MegamanControlMode
  megamanAutoMoveCooldown: number
  mettaurMoveCooldown: number
  setSpeed: (speed: Speed) => void
  cycleMegamanControlMode: () => void
  movePlayer: (deltaRow: number, deltaCol: number) => void
  useChipSlot: (index: number) => void
  useLeftmostChip: () => void
  manualFireBuster: () => void
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
const autoChipCadenceTicks = 8
const autoRecoverHpThreshold = 0.55
const megamanAutoMoveCadenceTicks = 8
const mettaurMoveCadenceTicks = 10

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
    | 'megamanControlMode'
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
    megamanControlMode: runtime.megamanControlMode,
    lastEvent
  }
}

const cycleControlMode = (mode: MegamanControlMode): MegamanControlMode => {
  if (mode === 'manual') {
    return 'semiAuto'
  }
  if (mode === 'semiAuto') {
    return 'fullAuto'
  }
  return 'manual'
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
const inEnemyArea = (position: PanelPosition) => position.row >= 0 && position.row < 3 && position.col >= 3 && position.col < 6

const moveEntityIfPossible = (
  entities: Record<EntityId, EntityState>,
  entityId: EntityId,
  targetPosition: PanelPosition
): Record<EntityId, EntityState> => {
  const entity = entities[entityId]
  if (!entity || !entity.alive) {
    return entities
  }

  const validArea = entityId === 'megaman' ? inPlayerArea(targetPosition) : inEnemyArea(targetPosition)
  if (!validArea) {
    return entities
  }

  if (targetPosition.row === entity.position.row && targetPosition.col === entity.position.col) {
    return entities
  }

  const occupiedPanels = buildOccupiedPanels(entities)
  const occupiedBy = occupiedPanels[makePanelKey(targetPosition)]
  if (occupiedBy && occupiedBy !== entityId) {
    return entities
  }

  return {
    ...entities,
    [entityId]: {
      ...entity,
      position: targetPosition
    }
  }
}

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

const chooseAutoChipSlot = (state: Pick<GameState, 'chipHand' | 'entities' | 'barrierCharges'>): number | null => {
  const { chipHand, entities, barrierCharges } = state
  const playerHpRatio = entities.megaman.maxHp > 0 ? entities.megaman.hp / entities.megaman.maxHp : 0

  if (playerHpRatio <= autoRecoverHpThreshold) {
    const recoverSlot = chipHand.findIndex((chip) => chip?.id === 'recover10')
    if (recoverSlot >= 0) {
      return recoverSlot
    }
  }

  if (barrierCharges === 0) {
    const barrierSlot = chipHand.findIndex((chip) => chip?.id === 'barrier')
    if (barrierSlot >= 0) {
      return barrierSlot
    }
  }

  const swordSlot = chipHand.findIndex((chip) => chip?.id === 'sword')
  if (swordSlot >= 0) {
    return swordSlot
  }

  const cannonSlot = chipHand.findIndex((chip) => chip?.id === 'cannon')
  if (cannonSlot >= 0) {
    return cannonSlot
  }

  return null
}

const chooseMegamanAutoMove = (entities: Record<EntityId, EntityState>): PanelPosition => {
  const megaman = entities.megaman
  const mettaur = entities.mettaur

  const rowDelta = mettaur.position.row === megaman.position.row ? 0 : mettaur.position.row > megaman.position.row ? 1 : -1
  const preferred: PanelPosition[] = [
    { row: megaman.position.row + rowDelta, col: megaman.position.col },
    { row: megaman.position.row, col: megaman.position.col + 1 },
    { row: megaman.position.row, col: megaman.position.col - 1 },
    { row: megaman.position.row - 1, col: megaman.position.col },
    { row: megaman.position.row + 1, col: megaman.position.col }
  ]

  const next = preferred.find((position) => inPlayerArea(position))
  return next ?? megaman.position
}

const chooseMettaurAutoMove = (entities: Record<EntityId, EntityState>): PanelPosition => {
  const mettaur = entities.mettaur
  const megaman = entities.megaman

  const rowDelta = megaman.position.row === mettaur.position.row ? 0 : megaman.position.row > mettaur.position.row ? 1 : -1
  const preferred: PanelPosition[] = [
    { row: mettaur.position.row + rowDelta, col: mettaur.position.col },
    { row: mettaur.position.row, col: mettaur.position.col - 1 },
    { row: mettaur.position.row, col: mettaur.position.col + 1 },
    { row: mettaur.position.row - 1, col: mettaur.position.col },
    { row: mettaur.position.row + 1, col: mettaur.position.col }
  ]

  const next = preferred.find((position) => inEnemyArea(position))
  return next ?? mettaur.position
}

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

const chooseAutoChipSlot = (state: Pick<GameState, 'chipHand' | 'entities' | 'barrierCharges'>): number | null => {
  const { chipHand, entities, barrierCharges } = state
  const playerHpRatio = entities.megaman.maxHp > 0 ? entities.megaman.hp / entities.megaman.maxHp : 0

  if (playerHpRatio <= autoRecoverHpThreshold) {
    const recoverSlot = chipHand.findIndex((chip) => chip?.id === 'recover10')
    if (recoverSlot >= 0) {
      return recoverSlot
    }
  }

  if (barrierCharges === 0) {
    const barrierSlot = chipHand.findIndex((chip) => chip?.id === 'barrier')
    if (barrierSlot >= 0) {
      return barrierSlot
    }
  }

  const swordSlot = chipHand.findIndex((chip) => chip?.id === 'sword')
  if (swordSlot >= 0) {
    return swordSlot
  }

  const cannonSlot = chipHand.findIndex((chip) => chip?.id === 'cannon')
  if (cannonSlot >= 0) {
    return cannonSlot
  }

  return null
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
  | 'autoChipCooldown'
  | 'megamanControlMode'
  | 'megamanAutoMoveCooldown'
  | 'mettaurMoveCooldown'
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
    megamanHitstunTicks: 0,
    autoChipCooldown: autoChipCadenceTicks,
    megamanControlMode: 'semiAuto',
    megamanAutoMoveCooldown: megamanAutoMoveCadenceTicks,
    mettaurMoveCooldown: mettaurMoveCadenceTicks
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
  cycleMegamanControlMode: () => {
    set((current) => {
      const nextMode = cycleControlMode(current.megamanControlMode)
      const runtime = {
        mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: current.queuedChipSlot,
        megamanControlMode: nextMode
      }

      return {
        megamanControlMode: nextMode,
        combat: buildCombatSummary(current.entities, runtime, `Control mode set to ${nextMode}`)
      }
    })
  },
  movePlayer: (deltaRow, deltaCol) => {
    set((current) => {
      if (current.megamanControlMode !== 'manual') {
        return {}
      }

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
        queuedChipSlot: current.queuedChipSlot,
        megamanControlMode: current.megamanControlMode
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
          queuedChipSlot: index,
          megamanControlMode: current.megamanControlMode
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
          queuedChipSlot: current.queuedChipSlot,
          megamanControlMode: current.megamanControlMode
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
        queuedChipSlot: null,
        megamanControlMode: current.megamanControlMode
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
  manualFireBuster: () => {
    set((current) => {
      if (current.megamanControlMode !== 'manual' || current.megamanBusterCooldown > 0) {
        return {}
      }

      const result = applyDamage(current.entities.megaman, current.entities.mettaur, megamanHitDamage)
      const nextEntities = {
        ...current.entities,
        megaman: result.source,
        mettaur: result.target
      }
      const runtime = {
        mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: current.queuedChipSlot,
        megamanControlMode: current.megamanControlMode
      }

      return {
        entities: nextEntities,
        occupiedPanels: buildOccupiedPanels(nextEntities),
        megamanBusterCooldown: megamanBusterCadenceTicks,
        combat: buildCombatSummary(nextEntities, runtime, result.didHit ? `Manual MegaBuster hit for ${megamanHitDamage}` : 'Manual MegaBuster missed')
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
          let autoChipCooldown = Math.max(0, current.autoChipCooldown - 1)
          let megamanAutoMoveCooldown = Math.max(0, current.megamanAutoMoveCooldown - 1)
          let mettaurMoveCooldown = Math.max(0, current.mettaurMoveCooldown - 1)
          const megamanControlMode = current.megamanControlMode
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

          if (nextEntities.megaman.alive && megamanControlMode !== 'manual' && megamanAutoMoveCooldown === 0) {
            const autoMove = chooseMegamanAutoMove(nextEntities)
            const movedEntities = moveEntityIfPossible(nextEntities, 'megaman', autoMove)
            if (movedEntities !== nextEntities) {
              nextEntities = movedEntities
              lastEvent = 'MegaMan auto moved'
            }
            megamanAutoMoveCooldown = megamanAutoMoveCadenceTicks
          }

          if (nextEntities.mettaur.alive && mettaurMoveCooldown === 0) {
            const autoMove = chooseMettaurAutoMove(nextEntities)
            const movedEntities = moveEntityIfPossible(nextEntities, 'mettaur', autoMove)
            if (movedEntities !== nextEntities) {
              nextEntities = movedEntities
              lastEvent = 'Mettaur shifted position'
            }
            mettaurMoveCooldown = mettaurMoveCadenceTicks
          }

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
              autoChipCooldown = autoChipCadenceTicks
            } else {
              queuedChipSlot = null
            }
          }

          if (megamanControlMode === 'fullAuto' && queuedChipSlot === null && autoChipCooldown === 0 && !megamanBusy) {
            const autoSlot = chooseAutoChipSlot({
              chipHand,
              entities: nextEntities,
              barrierCharges
            })

            if (autoSlot !== null) {
              const autoUse = tryUseChipFromSlot(
                { chipHand, chipDiscard, entities: nextEntities, barrierCharges },
                autoSlot
              )

              if (autoUse.used) {
                nextEntities = autoUse.entities
                chipHand = autoUse.chipHand
                chipDiscard = autoUse.chipDiscard
                barrierCharges = autoUse.barrierCharges
                lastEvent = `Auto chip: ${autoUse.lastEvent}`
              }
            }

            autoChipCooldown = autoChipCadenceTicks
          }

          if (queuedChipSlot === null && autoChipCooldown === 0 && !megamanBusy) {
            const autoSlot = chooseAutoChipSlot({
              chipHand,
              entities: nextEntities,
              barrierCharges
            })

            if (autoSlot !== null) {
              const autoUse = tryUseChipFromSlot(
                { chipHand, chipDiscard, entities: nextEntities, barrierCharges },
                autoSlot
              )

              if (autoUse.used) {
                nextEntities = autoUse.entities
                chipHand = autoUse.chipHand
                chipDiscard = autoUse.chipDiscard
                barrierCharges = autoUse.barrierCharges
                lastEvent = `Auto chip: ${autoUse.lastEvent}`
              }
            }

            autoChipCooldown = autoChipCadenceTicks
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

          if (megamanControlMode !== 'manual' && megamanBusterCooldown === 0) {
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
            queuedChipSlot,
            megamanControlMode
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
            megamanHitstunTicks,
            autoChipCooldown,
            megamanAutoMoveCooldown,
            mettaurMoveCooldown
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
