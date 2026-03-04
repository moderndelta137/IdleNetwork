import { create } from 'zustand'
import { loadChipCatalog, type ChipRuntimeId } from '../../chips/chipCatalog'
import { loadEnemyAttackCatalog } from '../../enemies/enemyAttackCatalog'

type Speed = 1 | 2 | 4
type MegamanControlMode = 'manual' | 'semiAuto' | 'fullAuto'

type EntityId = 'megaman' | 'mettaur'

type ChipId = ChipRuntimeId

type BattleChip = {
  id: ChipId
  name: string
  code: string
  formedFrom?: BattleChip[]
}

type ProgramAdvanceRule = {
  id: string
  name: string
  sequence: ChipId[]
  resultChip: BattleChip
  priority: number
}

type ProgramAdvanceAnimation = {
  sourceSlots: number[]
  targetSlot: number
  ticksRemaining: number
  name: string
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
  hitFlashTicks: number
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
  programAdvanceAnimation: ProgramAdvanceAnimation | null
  lastEvent: string
  activeHitboxPanels: string[]
}

type GameState = {
  ticks: number
  speed: Speed
  running: boolean
  debugPaused: boolean
  debugSpriteScalePercent: number
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
  chipFolder: BattleChip[]
  chipStock: BattleChip[]
  chipHand: Array<BattleChip | null>
  chipDeck: BattleChip[]
  chipDiscard: BattleChip[]
  queuedChipSlot: number | null
  barrierCharges: number
  megamanHitstunTicks: number
  megamanRecoveryTicks: number
  mettaurRecoveryTicks: number
  autoChipCooldown: number
  megamanControlMode: MegamanControlMode
  programAdvanceAnimation: ProgramAdvanceAnimation | null
  forceProgramAdvanceOnNextCustomDraw: boolean
  megamanAutoMoveCooldown: number
  mettaurMoveCooldown: number
  setSpeed: (speed: Speed) => void
  setDebugPaused: (paused: boolean) => void
  stepFrame: () => void
  setDebugSpriteScalePercent: (scale: number) => void
  cycleMegamanControlMode: () => void
  debugForceNextCustomDrawProgramAdvance: () => void
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
let pendingStepFrames = 0

const baseTickMs = 100
const megamanBusterCadenceTicks = 10
const mettaurAttackCadenceTicks = 14
const mettaurRespawnDelayTicks = 20
const customGaugeMaxTicks = 50
const defaultChipHandSize = 5
const megamanHitDamage = 8
const megamanHitstunTicksOnHit = 6
const megamanBusterRecoveryTicks = 2
const autoChipCadenceTicks = 8
const autoRecoverHpThreshold = 0.55
const megamanAutoMoveCadenceTicks = 5
const mettaurMoveCadenceTicks = 6
const mettaurThreatWindowTicks = 2
const hitFlashDurationTicks = 2
const programAdvanceAnimationTicks = 12

const chipCatalog = loadChipCatalog(baseTickMs)
const enemyAttackCatalog = loadEnemyAttackCatalog(baseTickMs)
const mettaurSwingAttack = enemyAttackCatalog.MettaurSwing
const mettaurTelegraphTicks = mettaurSwingAttack?.lagTicks ?? 4
const mettaurHitDamage = mettaurSwingAttack?.damage ?? 6
const mettaurSwingRecoveryTicks = mettaurSwingAttack?.recoilTicks ?? 6

const programAdvanceRules: ProgramAdvanceRule[] = [
  {
    id: 'pa-z-cannon',
    name: 'Z-Cannon',
    sequence: ['cannon', 'cannon', 'cannon'],
    resultChip: {
      id: 'zcannon',
      name: 'Z-Cannon',
      code: 'PA'
    },
    priority: 100
  }
]

const parseEffectNumber = (effects: string, prefix: string): number | null => {
  const match = effects.match(new RegExp(`${prefix}(\\d+)`))
  if (!match) {
    return null
  }

  return Number.parseInt(match[1], 10)
}

const parseMeleeOffsets = (effects: string): PanelPosition[] => {
  const match = effects.match(/melee:offsets=([^;]+)/)
  if (!match) {
    return []
  }

  return match[1]
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const [x, y] = pair.split('|')
      return {
        row: Number.parseInt(y, 10),
        col: Number.parseInt(x, 10)
      }
    })
    .filter((offset) => Number.isFinite(offset.row) && Number.isFinite(offset.col))
}

const parseHitscanRows = (effects: string): number[] => {
  const rowsStart = effects.indexOf('hitscan:rows=')
  if (rowsStart < 0) {
    return []
  }

  const afterRows = effects.slice(rowsStart + 'hitscan:rows='.length)
  const rowsSection = afterRows.split(';maxRange=')[0]

  return rowsSection
    .split(';')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
}

const canMeleeHitTarget = (megaman: EntityState, mettaur: EntityState, effects: string): boolean => {
  const offsets = parseMeleeOffsets(effects)

  return offsets.some((offset) => {
    const targetPanel = {
      row: megaman.position.row + offset.row,
      col: megaman.position.col + offset.col
    }

    return targetPanel.row === mettaur.position.row && targetPanel.col === mettaur.position.col
  })
}

const canHitscanHitTarget = (megaman: EntityState, mettaur: EntityState, effects: string): boolean => {
  const rowOffsets = parseHitscanRows(effects)
  const maxRange = parseEffectNumber(effects, 'maxRange=') ?? 6
  const colDelta = mettaur.position.col - megaman.position.col
  if (colDelta <= 0 || colDelta > maxRange) {
    return false
  }

  const rowDelta = mettaur.position.row - megaman.position.row
  if (!rowOffsets.includes(rowDelta)) {
    return false
  }

  return true
}

const canChipDamageHitTarget = (chipDefinition: { type: string; effects: string }, megaman: EntityState, mettaur: EntityState): boolean => {
  const chipType = chipDefinition.type.toLowerCase()

  if (chipType === 'melee') {
    return canMeleeHitTarget(megaman, mettaur, chipDefinition.effects)
  }

  if (chipType === 'hitscan') {
    return canHitscanHitTarget(megaman, mettaur, chipDefinition.effects)
  }

  return true
}

const starterFolder: BattleChip[] = [
  { id: 'cannon', name: 'Cannon', code: 'A' },
  { id: 'cannon', name: 'Cannon', code: 'B' },
  { id: 'cannon', name: 'Cannon', code: 'C' },
  { id: 'sword', name: 'Sword', code: 'A' },
  { id: 'recover10', name: 'Recover10', code: 'L' },
  { id: 'barrier', name: 'Barrier', code: 'L' },
  { id: 'sword', name: 'Sword', code: 'B' },
  { id: 'recover10', name: 'Recover10', code: 'A' },
  { id: 'barrier', name: 'Barrier', code: '*' }
]

const starterStock: BattleChip[] = [
  ...starterFolder,
  { id: 'cannon', name: 'Cannon', code: 'A' },
  { id: 'sword', name: 'Sword', code: 'A' },
  { id: 'recover10', name: 'Recover10', code: 'L' },
  { id: 'barrier', name: 'Barrier', code: '*' }
]

const createInitialEntities = (): Record<EntityId, EntityState> => ({
  megaman: {
    id: 'megaman',
    name: 'MegaMan.EXE',
    position: { row: 1, col: 1 },
    alive: true,
    hp: 120,
    maxHp: 120,
    hitFlashTicks: 0
  },
  mettaur: {
    id: 'mettaur',
    name: 'Mettaur',
    position: { row: 1, col: 4 },
    alive: true,
    hp: 90,
    maxHp: 90,
    hitFlashTicks: 0
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


const recycleDeckIfEmpty = (
  deck: BattleChip[],
  discard: BattleChip[]
): { chipDeck: BattleChip[]; chipDiscard: BattleChip[]; didRecycle: boolean } => {
  if (deck.length > 0 || discard.length === 0) {
    return { chipDeck: deck, chipDiscard: discard, didRecycle: false }
  }

  return {
    chipDeck: shuffleChips(discard),
    chipDiscard: [],
    didRecycle: true
  }
}

const findProgramAdvanceMatchSlots = (hand: Array<BattleChip | null>, rule: ProgramAdvanceRule): number[] | null => {
  const matched: number[] = []

  for (const chipId of rule.sequence) {
    const slot = hand.findIndex((chip, index) => chip?.id === chipId && !matched.includes(index))
    if (slot < 0) {
      return null
    }
    matched.push(slot)
  }

  return matched
}

const forceProgramAdvanceHand = (hand: Array<BattleChip | null>, rule: ProgramAdvanceRule): Array<BattleChip | null> => {
  const nextHand = [...hand]

  rule.sequence.forEach((chipId, index) => {
    nextHand[index] = {
      id: chipId,
      name: chipCatalog[chipId].name,
      code: String.fromCharCode(65 + index)
    }
  })

  return nextHand
}

const tryFormProgramAdvanceFromHand = (
  hand: Array<BattleChip | null>
): { chipHand: Array<BattleChip | null>; animation: ProgramAdvanceAnimation | null; lastEvent: string | null } => {
  const sortedRules = [...programAdvanceRules].sort((a, b) => b.priority - a.priority)

  // Intentionally forms at most one PA per hand evaluation, even if overlapping or duplicate windows exist.

  for (const rule of sortedRules) {
    const matchedSlots = findProgramAdvanceMatchSlots(hand, rule)
    if (!matchedSlots) {
      continue
    }

    const [targetSlot, ...sourceSlots] = matchedSlots
    const nextHand = [...hand]
    const componentChips = matchedSlots
      .map((slot) => hand[slot])
      .filter((chip): chip is BattleChip => chip !== null)
      .map((chip) => ({ id: chip.id, name: chip.name, code: chip.code }))

    nextHand[targetSlot] = {
      ...rule.resultChip,
      formedFrom: componentChips
    }
    sourceSlots.forEach((slot) => {
      nextHand[slot] = null
    })

    return {
      chipHand: nextHand,
      animation: {
        sourceSlots,
        targetSlot,
        ticksRemaining: programAdvanceAnimationTicks,
        name: rule.name
      },
      lastEvent: `PROGRAM ADVANCE! ${rule.name} formed in slot ${targetSlot + 1}`
    }
  }

  return {
    chipHand: hand,
    animation: null,
    lastEvent: null
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


const buildMettaurSwingHitboxPanels = (entities: Record<EntityId, EntityState>, telegraphTicks: number): string[] => {
  const mettaur = entities.mettaur
  if (!mettaur.alive || telegraphTicks <= 0) {
    return []
  }

  const tiles: string[] = []
  for (let offset = 1; offset <= 2; offset += 1) {
    const target: PanelPosition = {
      row: mettaur.position.row,
      col: mettaur.position.col - offset
    }
    if (inPlayerArea(target)) {
      tiles.push(makePanelKey(target))
    }
  }

  return tiles
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
    | 'programAdvanceAnimation'
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
    programAdvanceAnimation: runtime.programAdvanceAnimation,
    lastEvent,
    activeHitboxPanels: buildMettaurSwingHitboxPanels(entities, runtime.mettaurTelegraphTicksRemaining)
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
      alive: nextHp > 0,
      hitFlashTicks: hitFlashDurationTicks
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

const isSameRow = (source: EntityState, target: EntityState) => source.position.row === target.position.row

const canMegamanBusterHit = (megaman: EntityState, mettaur: EntityState) =>
  isSameRow(megaman, mettaur) && megaman.position.col < mettaur.position.col

const canMettaurSwingHit = (mettaur: EntityState, megaman: EntityState) => {
  if (!isSameRow(mettaur, megaman)) {
    return false
  }

  const colDistance = Math.abs(mettaur.position.col - megaman.position.col)
  return colDistance > 0 && colDistance <= 2
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
  megamanRecoveryTicks: number
} => {
  const chip = current.chipHand[slot]
  if (!chip) {
    return {
      entities: current.entities,
      chipHand: current.chipHand,
      chipDiscard: current.chipDiscard,
      barrierCharges: current.barrierCharges,
      lastEvent: 'Selected chip slot is empty',
      used: false,
      megamanRecoveryTicks: 0
    }
  }

  const chipDefinition = chipCatalog[chip.id]
  let nextEntities = { ...current.entities }
  let barrierCharges = current.barrierCharges
  let lastEvent = `Chip used: ${chip.name} ${chip.code}`
  let megamanRecoveryTicks = chipDefinition.recoilTicks

  if (chipDefinition.damage > 0) {
    const canHit = canChipDamageHitTarget(chipDefinition, nextEntities.megaman, nextEntities.mettaur)
    if (canHit) {
      const result = applyDamage(nextEntities.megaman, nextEntities.mettaur, chipDefinition.damage)
      nextEntities = {
        ...nextEntities,
        megaman: result.source,
        mettaur: result.target
      }
      if (result.didHit) {
        lastEvent = `${chip.name} hit for ${chipDefinition.damage}`
      }
    } else {
      lastEvent = `${chip.name} missed (out of range/line)`
    }
  }

  const healAmount = parseEffectNumber(chipDefinition.effects, 'heal:amount=')
  if (healAmount) {
    const nextHp = Math.min(nextEntities.megaman.maxHp, nextEntities.megaman.hp + healAmount)
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

  const barrierAmount = parseEffectNumber(chipDefinition.effects, 'barrier:charges=')
  if (barrierAmount) {
    barrierCharges = barrierAmount
    lastEvent = `${chip.name} barrier ready`
  }

  const nextHand = [...current.chipHand]
  nextHand[slot] = null

  const chipsToDiscard = chip.formedFrom && chip.formedFrom.length > 0 ? chip.formedFrom : [chip]

  return {
    entities: nextEntities,
    chipHand: nextHand,
    chipDiscard: [...current.chipDiscard, ...chipsToDiscard],
    barrierCharges,
    lastEvent,
    used: true,
    megamanRecoveryTicks
  }
}

const chooseAutoChipSlot = (state: Pick<GameState, 'chipHand' | 'entities' | 'barrierCharges'>): number | null => {
  const { chipHand, entities, barrierCharges } = state
  const playerHpRatio = entities.megaman.maxHp > 0 ? entities.megaman.hp / entities.megaman.maxHp : 0

  const paSlot = chipHand.findIndex((chip) => chip?.id === 'zcannon')
  if (paSlot >= 0) {
    return paSlot
  }

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

const chooseMegamanAutoMove = (
  entities: Record<EntityId, EntityState>,
  state: Pick<GameState, 'mettaurTelegraphTicksRemaining' | 'mettaurAttackCooldown' | 'megamanBusterCooldown'>
): PanelPosition => {
  const megaman = entities.megaman
  const mettaur = entities.mettaur

  const candidates: PanelPosition[] = [
    megaman.position,
    { row: megaman.position.row - 1, col: megaman.position.col },
    { row: megaman.position.row + 1, col: megaman.position.col },
    { row: megaman.position.row, col: megaman.position.col + 1 },
    { row: megaman.position.row, col: megaman.position.col - 1 }
  ].filter(inPlayerArea)

  const mettaurThreatSoon =
    state.mettaurTelegraphTicksRemaining > 0 ||
    (state.mettaurAttackCooldown > 0 && state.mettaurAttackCooldown <= mettaurThreatWindowTicks)
  const busterReadySoon = state.megamanBusterCooldown <= 2

  let best = megaman.position
  let bestScore = Number.NEGATIVE_INFINITY

  candidates.forEach((candidate) => {
    const rowAligned = candidate.row === mettaur.position.row
    const colDistance = Math.abs(mettaur.position.col - candidate.col)
    const forwardPressure = candidate.col

    let score = 0
    if (mettaurThreatSoon) {
      score += rowAligned ? -8 : 8
    } else if (busterReadySoon) {
      score += rowAligned ? 6 : -2
    } else {
      score += rowAligned ? 2 : 0
    }

    score += Math.max(0, 3 - colDistance)
    score += forwardPressure * 0.5

    if (candidate.row === megaman.position.row && candidate.col === megaman.position.col) {
      score -= 1
    }

    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  })

  return best
}

const chooseMettaurAutoMove = (
  entities: Record<EntityId, EntityState>,
  state: Pick<GameState, 'megamanBusterCooldown' | 'mettaurTelegraphTicksRemaining'>
): PanelPosition => {
  const mettaur = entities.mettaur
  const megaman = entities.megaman

  const candidates: PanelPosition[] = [
    mettaur.position,
    { row: mettaur.position.row - 1, col: mettaur.position.col },
    { row: mettaur.position.row + 1, col: mettaur.position.col },
    { row: mettaur.position.row, col: mettaur.position.col - 1 },
    { row: mettaur.position.row, col: mettaur.position.col + 1 }
  ].filter(inEnemyArea)

  const megamanBusterSoon = state.megamanBusterCooldown <= 2
  const inTelegraph = state.mettaurTelegraphTicksRemaining > 0

  let best = mettaur.position
  let bestScore = Number.NEGATIVE_INFINITY

  candidates.forEach((candidate) => {
    const rowAligned = candidate.row === megaman.position.row
    const colDistance = Math.abs(candidate.col - megaman.position.col)

    let score = 0
    if (megamanBusterSoon && !inTelegraph) {
      score += rowAligned ? -7 : 5
    } else {
      score += rowAligned ? 4 : -1
    }

    if (colDistance <= 2) {
      score += 4
    } else {
      score -= Math.min(3, colDistance - 2)
    }

    if (candidate.col === mettaur.position.col && candidate.row === mettaur.position.row) {
      score -= 1
    }

    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  })

  return best
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
  | 'chipFolder'
  | 'chipStock'
  | 'chipHand'
  | 'chipDeck'
  | 'chipDiscard'
  | 'queuedChipSlot'
  | 'barrierCharges'
  | 'megamanHitstunTicks'
  | 'megamanRecoveryTicks'
  | 'mettaurRecoveryTicks'
  | 'autoChipCooldown'
  | 'megamanControlMode'
  | 'megamanAutoMoveCooldown'
  | 'mettaurMoveCooldown'
  | 'programAdvanceAnimation'
  | 'forceProgramAdvanceOnNextCustomDraw'
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
    chipFolder: starterFolder,
    chipStock: starterStock,
    chipHand: firstFill.chipHand,
    chipDeck: firstFill.chipDeck,
    chipDiscard: firstFill.chipDiscard,
    queuedChipSlot: null,
    barrierCharges: 0,
    megamanHitstunTicks: 0,
    megamanRecoveryTicks: 0,
    mettaurRecoveryTicks: 0,
    autoChipCooldown: autoChipCadenceTicks,
    megamanControlMode: 'semiAuto',
    megamanAutoMoveCooldown: megamanAutoMoveCadenceTicks,
    mettaurMoveCooldown: mettaurMoveCadenceTicks,
    programAdvanceAnimation: null,
    forceProgramAdvanceOnNextCustomDraw: false
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
  debugPaused: false,
  debugSpriteScalePercent: 300,
  setSpeed: (speed) => set({ speed }),
  setDebugPaused: (paused) => {
    if (!paused) {
      pendingStepFrames = 0
    }
    set({ debugPaused: paused })
  },
  stepFrame: () => {
    if (!get().debugPaused) {
      return
    }
    pendingStepFrames += 1
  },
  setDebugSpriteScalePercent: (scale) => {
    const clampedScale = Math.max(100, Math.min(400, Math.round(scale)))
    set({ debugSpriteScalePercent: clampedScale })
  },
  debugForceNextCustomDrawProgramAdvance: () => {
    set((current) => {
      const runtime = {
        mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: current.queuedChipSlot,
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation
      }

      return {
        forceProgramAdvanceOnNextCustomDraw: true,
        combat: buildCombatSummary(current.entities, runtime, 'Debug: next Custom Draw will force PA set')
      }
    })
  },
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
        megamanControlMode: nextMode,
        programAdvanceAnimation: current.programAdvanceAnimation
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
      if (!player.alive || current.megamanRecoveryTicks > 0) {
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
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation
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

      const megamanBusy = !current.entities.megaman.alive || current.megamanHitstunTicks > 0 || current.megamanRecoveryTicks > 0

      if (megamanBusy) {
        const runtime = {
          mettaurTelegraphTicksRemaining: current.mettaurTelegraphTicksRemaining,
          customGaugeTicks: current.customGaugeTicks,
          customGaugeMaxTicks: current.customGaugeMaxTicks,
          chipHand: current.chipHand,
          barrierCharges: current.barrierCharges,
          megamanHitstunTicks: current.megamanHitstunTicks,
          queuedChipSlot: index,
          megamanControlMode: current.megamanControlMode,
          programAdvanceAnimation: current.programAdvanceAnimation
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
          megamanControlMode: current.megamanControlMode,
          programAdvanceAnimation: current.programAdvanceAnimation
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
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation
      }

      return {
        entities: result.entities,
        occupiedPanels: buildOccupiedPanels(result.entities),
        chipHand: result.chipHand,
        chipDiscard: result.chipDiscard,
        barrierCharges: result.barrierCharges,
        queuedChipSlot: null,
        megamanRecoveryTicks: result.megamanRecoveryTicks,
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
      if (current.megamanControlMode !== 'manual' || current.megamanBusterCooldown > 0 || current.megamanRecoveryTicks > 0) {
        return {}
      }

      const canHit = canMegamanBusterHit(current.entities.megaman, current.entities.mettaur)
      const result = canHit
        ? applyDamage(current.entities.megaman, current.entities.mettaur, megamanHitDamage)
        : { source: current.entities.megaman, target: current.entities.mettaur, didHit: false }
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
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation
      }

      return {
        entities: nextEntities,
        occupiedPanels: buildOccupiedPanels(nextEntities),
        megamanBusterCooldown: megamanBusterCadenceTicks,
        megamanRecoveryTicks: megamanBusterRecoveryTicks,
        combat: buildCombatSummary(nextEntities, runtime, result.didHit ? `Manual MegaBuster hit for ${megamanHitDamage}` : 'Manual MegaBuster missed (out of line)')
      }
    })
  },
  resetBattle: () => {
    set((current) => {
      const next = buildInitialState()
      return {
        ...next,
        speed: current.speed,
        running: current.running,
        debugPaused: current.debugPaused,
        debugSpriteScalePercent: current.debugSpriteScalePercent
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

      if (state.debugPaused) {
        if (pendingStepFrames > 0) {
          pendingStepFrames -= 1
          accumulator = Math.max(accumulator, baseTickMs)
        } else {
          accumulator = 0
        }
      } else {
        accumulator += delta * state.speed
      }

      while (accumulator >= baseTickMs) {
        accumulator -= baseTickMs
        set((current) => {
          const nextTicks = current.ticks + 1
          let nextEntities = {
            ...current.entities,
            megaman: {
              ...current.entities.megaman,
              hitFlashTicks: Math.max(0, current.entities.megaman.hitFlashTicks - 1)
            },
            mettaur: {
              ...current.entities.mettaur,
              hitFlashTicks: Math.max(0, current.entities.mettaur.hitFlashTicks - 1)
            }
          }
          let megamanBusterCooldown = Math.max(0, current.megamanBusterCooldown - 1)
          let mettaurAttackCooldown = Math.max(0, current.mettaurAttackCooldown - 1)
          let mettaurTelegraphTicksRemaining = current.mettaurTelegraphTicksRemaining
          let mettaurRespawnTick = current.mettaurRespawnTick
          let gaugeTicks = current.customGaugeTicks + 1
          let chipHand = current.chipHand
          let chipDeck = current.chipDeck
          let chipDiscard = current.chipDiscard
          const recycledDeck = recycleDeckIfEmpty(chipDeck, chipDiscard)
          chipDeck = recycledDeck.chipDeck
          chipDiscard = recycledDeck.chipDiscard
          let queuedChipSlot = current.queuedChipSlot
          let barrierCharges = current.barrierCharges
          let megamanHitstunTicks = Math.max(0, current.megamanHitstunTicks - 1)
          let megamanRecoveryTicks = Math.max(0, current.megamanRecoveryTicks - 1)
          let mettaurRecoveryTicks = Math.max(0, current.mettaurRecoveryTicks - 1)
          let autoChipCooldown = Math.max(0, current.autoChipCooldown - 1)
          let megamanAutoMoveCooldown = Math.max(0, current.megamanAutoMoveCooldown - 1)
          let mettaurMoveCooldown = Math.max(0, current.mettaurMoveCooldown - 1)
          let programAdvanceAnimation =
            current.programAdvanceAnimation && current.programAdvanceAnimation.ticksRemaining > 1
              ? { ...current.programAdvanceAnimation, ticksRemaining: current.programAdvanceAnimation.ticksRemaining - 1 }
              : null
          let forceProgramAdvanceOnNextCustomDraw = current.forceProgramAdvanceOnNextCustomDraw
          const megamanControlMode = current.megamanControlMode
          let lastEvent = recycledDeck.didRecycle ? 'Deck recycled from discard pile' : 'Idle tick'

          if (gaugeTicks >= current.customGaugeMaxTicks) {
            const refill = fillHandSlots(chipHand, chipDeck, chipDiscard)
            chipHand = refill.chipHand
            chipDeck = refill.chipDeck
            chipDiscard = refill.chipDiscard

            if (forceProgramAdvanceOnNextCustomDraw) {
              chipHand = forceProgramAdvanceHand(chipHand, programAdvanceRules[0])
              forceProgramAdvanceOnNextCustomDraw = false
            }

            const formed = tryFormProgramAdvanceFromHand(chipHand)
            chipHand = formed.chipHand
            if (formed.animation) {
              programAdvanceAnimation = formed.animation
              lastEvent = formed.lastEvent ?? 'PROGRAM ADVANCE formed'
            }

            gaugeTicks = 0
            if (!formed.animation) {
              lastEvent = 'Custom Gauge full. Hand refilled from deck.'
            }
          }

          const megamanBusy = !nextEntities.megaman.alive || megamanHitstunTicks > 0 || megamanRecoveryTicks > 0

          if (nextEntities.megaman.alive && megamanControlMode !== 'manual' && megamanAutoMoveCooldown === 0) {
            const autoMove = chooseMegamanAutoMove(nextEntities, {
              mettaurTelegraphTicksRemaining,
              mettaurAttackCooldown,
              megamanBusterCooldown
            })
            const movedEntities = moveEntityIfPossible(nextEntities, 'megaman', autoMove)
            if (movedEntities !== nextEntities) {
              nextEntities = movedEntities
              lastEvent = 'MegaMan repositioned'
            }
            megamanAutoMoveCooldown = megamanAutoMoveCadenceTicks
          }

          if (nextEntities.mettaur.alive && mettaurMoveCooldown === 0 && mettaurTelegraphTicksRemaining === 0 && mettaurRecoveryTicks === 0) {
            const autoMove = chooseMettaurAutoMove(nextEntities, {
              megamanBusterCooldown,
              mettaurTelegraphTicksRemaining
            })
            const movedEntities = moveEntityIfPossible(nextEntities, 'mettaur', autoMove)
            if (movedEntities !== nextEntities) {
              nextEntities = movedEntities
              lastEvent = 'Mettaur repositioned'
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
              megamanRecoveryTicks = queuedUse.megamanRecoveryTicks
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
                megamanRecoveryTicks = autoUse.megamanRecoveryTicks
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
              position: { row: 1, col: 4 },
              hitFlashTicks: 0
            }
            mettaurRespawnTick = null
            mettaurAttackCooldown = mettaurAttackCadenceTicks
            mettaurTelegraphTicksRemaining = 0
            mettaurRecoveryTicks = 0
            lastEvent = 'Mettaur respawned'
          }

          if (!megamanBusy && megamanControlMode !== 'manual' && megamanBusterCooldown === 0) {
            if (canMegamanBusterHit(nextEntities.megaman, nextEntities.mettaur)) {
              const result = applyDamage(nextEntities.megaman, nextEntities.mettaur, megamanHitDamage)
              nextEntities = {
                ...nextEntities,
                megaman: result.source,
                mettaur: result.target
              }
              if (result.didHit) {
                lastEvent = `MegaBuster hit for ${megamanHitDamage}`
              }
            } else {
              lastEvent = 'MegaBuster missed (out of line)'
            }
            megamanBusterCooldown = megamanBusterCadenceTicks
            megamanRecoveryTicks = megamanBusterRecoveryTicks
          }

          if (nextEntities.mettaur.alive && nextEntities.megaman.alive) {
            if (mettaurTelegraphTicksRemaining > 0) {
              mettaurTelegraphTicksRemaining -= 1

              if (mettaurTelegraphTicksRemaining === 0) {
                if (canMettaurSwingHit(nextEntities.mettaur, nextEntities.megaman)) {
                  if (barrierCharges > 0) {
                    barrierCharges -= 1
                    lastEvent = 'Barrier blocked Mettaur swing'
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
                } else {
                  lastEvent = 'Mettaur swing missed'
                }
                mettaurRecoveryTicks = mettaurSwingRecoveryTicks
              }
            } else if (mettaurAttackCooldown === 0 && mettaurRecoveryTicks === 0) {
              mettaurTelegraphTicksRemaining = mettaurTelegraphTicks
              mettaurAttackCooldown = mettaurAttackCadenceTicks
              lastEvent = `Mettaur telegraph (${mettaurTelegraphTicks} ticks)`
            }
          } else {
            mettaurTelegraphTicksRemaining = 0
            mettaurRecoveryTicks = 0
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
            megamanControlMode,
            programAdvanceAnimation
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
            megamanRecoveryTicks,
            mettaurRecoveryTicks,
            autoChipCooldown,
            megamanAutoMoveCooldown,
            mettaurMoveCooldown,
            programAdvanceAnimation,
            forceProgramAdvanceOnNextCustomDraw
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
      pendingStepFrames = 0
      set({ running: false })
    }
  }
}))
