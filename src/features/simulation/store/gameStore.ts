import { create } from 'zustand'
import { loadChipCatalog, type ChipRuntimeId } from '../../chips/chipCatalog'
import { loadEnemyAttackCatalog } from '../../enemies/enemyAttackCatalog'
import { sanitizeQueuedChipSlot, shuffleChipsDeterministic } from './stabilityUtils'

type Speed = 1 | 2 | 4
type MegamanControlMode = 'manual' | 'semiAuto' | 'fullAuto'
type WaveStatus = 'inProgress' | 'waveCleared' | 'levelCleared' | 'failed'

type WaveReward = {
  zenny: number
  chips: BattleChip[]
}

type WaveResultSummary = {
  wave: number
  level: number
  deleteTimeLabel: string
  bustingLv: number
  reward: WaveReward
}

type VirusEntityId = 'mettaur' | 'mettaur2' | 'mettaur3' | 'mettaur4' | 'mettaur5' | 'mettaur6'
type EntityId = 'megaman' | VirusEntityId

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

type VirusAiState = {
  attackCooldown: number
  telegraphTicksRemaining: number
  recoveryTicks: number
  moveCooldown: number
}

type VirusAiById = Record<VirusEntityId, VirusAiState>

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
  chipIndicatorPanels: string[]
  currentLevel: number
  currentWave: number
  isBossWave: boolean
  waveStatus: WaveStatus
  waveResult: WaveResultSummary | null
  battleStartBannerTicks: number
  totalZenny: number
  virusesRemaining: number
  virusesTotal: number
}

type GameState = {
  ticks: number
  speed: Speed
  running: boolean
  debugPaused: boolean
  debugSpriteScalePercent: number
  entities: Record<EntityId, EntityState>
  virusAi: VirusAiById
  occupiedPanels: OccupiedPanels
  combat: CombatSummary
  megamanBusterCooldown: number
  mettaurAttackCooldown: number
  mettaurTelegraphTicksRemaining: number
  mettaurRespawnTick: number | null
  currentLevel: number
  currentWave: number
  waveStatus: WaveStatus
  waveTransitionTick: number | null
  waveStartedAtTick: number
  waveResult: WaveResultSummary | null
  battleStartBannerTicks: number
  totalZenny: number
  virusesRemaining: number
  virusesTotal: number
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
  pendingStepReturnPosition: PanelPosition | null
  pendingStepReturnTicks: number
  autoChipCooldown: number
  megamanControlMode: MegamanControlMode
  programAdvanceAnimation: ProgramAdvanceAnimation | null
  forceProgramAdvanceOnNextCustomDraw: boolean
  chipIndicatorPanels: string[]
  chipIndicatorTicksRemaining: number
  megamanAutoMoveCooldown: number
  mettaurMoveCooldown: number
  debugCompleteWaveRequested: boolean
  setSpeed: (speed: Speed) => void
  setDebugPaused: (paused: boolean) => void
  stepFrame: () => void
  setDebugSpriteScalePercent: (scale: number) => void
  moveFolderChipToStock: (index: number) => void
  moveStockChipToFolder: (chipId: ChipId, code: string) => void
  cycleMegamanControlMode: () => void
  debugForceNextCustomDrawProgramAdvance: () => void
  debugCompleteCurrentWave: () => void
  movePlayer: (deltaRow: number, deltaCol: number) => void
  useChipSlot: (index: number) => void
  useLeftmostChip: () => void
  manualFireBuster: () => void
  closeWaveResult: () => void
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
const folderMbLimit = 200
const boardRowCount = 3
const boardColCount = 6
const chipIndicatorDurationTicks = 3
const maxWavesPerLevel = 10
const waveTransitionDelayTicks = 20
const bossWaveHpMultiplier = 1.6
const waveHpStep = 8
const battleStartBannerDurationTicks = 10

const chipCatalog = loadChipCatalog(baseTickMs)
const enemyAttackCatalog = loadEnemyAttackCatalog(baseTickMs)
const mettaurSwingAttack = enemyAttackCatalog.MettaurSwing
const mettaurTelegraphTicks = mettaurSwingAttack?.lagTicks ?? 4
const mettaurHitDamage = mettaurSwingAttack?.damage ?? 6
const mettaurSwingRecoveryTicks = mettaurSwingAttack?.recoilTicks ?? 6

const virusEntityIds: VirusEntityId[] = ['mettaur', 'mettaur2', 'mettaur3', 'mettaur4', 'mettaur5', 'mettaur6']
const virusSpawnPositions: PanelPosition[] = [
  { row: 0, col: 3 },
  { row: 1, col: 3 },
  { row: 2, col: 3 },
  { row: 0, col: 4 },
  { row: 1, col: 4 },
  { row: 2, col: 4 }
]

const getWaveEnemyMaxHp = (wave: number): number => {
  const clampedWave = Math.max(1, Math.min(maxWavesPerLevel, wave))
  const baseHp = 90 + (clampedWave - 1) * waveHpStep
  return clampedWave === maxWavesPerLevel ? Math.round(baseHp * bossWaveHpMultiplier) : baseHp
}

const isBossWave = (wave: number): boolean => wave === maxWavesPerLevel

const getWaveVirusCount = (wave: number): number => Math.min(1 + Math.floor(Math.max(1, wave) / 2), 6)

const getWaveVirusSpawnHp = (wave: number, spawnIndex: number): number => {
  const baseHp = getWaveEnemyMaxHp(wave)
  return baseHp + Math.max(0, spawnIndex - 1) * 12
}


const getAliveVirusIds = (entities: Record<EntityId, EntityState>): VirusEntityId[] =>
  virusEntityIds.filter((id) => entities[id]?.alive)

const getActiveVirusId = (entities: Record<EntityId, EntityState>): VirusEntityId | null => {
  const alive = getAliveVirusIds(entities)
  if (alive.length === 0) {
    return null
  }

  return alive.sort((a, b) => {
    const first = entities[a]
    const second = entities[b]
    if (first.position.col !== second.position.col) {
      return first.position.col - second.position.col
    }
    return first.position.row - second.position.row
  })[0]
}

const projectCombatEntities = (
  entities: Record<EntityId, EntityState>
): { combatEntities: Record<EntityId, EntityState>; activeVirusId: VirusEntityId | null } => {
  const activeVirusId = getActiveVirusId(entities)
  if (!activeVirusId) {
    return {
      combatEntities: {
        ...entities,
        mettaur: {
          ...entities.mettaur,
          alive: false,
          hp: 0
        }
      },
      activeVirusId: null
    }
  }

  return {
    combatEntities: {
      ...entities,
      mettaur: { ...entities[activeVirusId] }
    },
    activeVirusId
  }
}

const mergeCombatEntities = (
  base: Record<EntityId, EntityState>,
  combat: Record<EntityId, EntityState>,
  activeVirusId: VirusEntityId | null
): Record<EntityId, EntityState> => {
  const next = { ...base, megaman: combat.megaman }
  if (activeVirusId) {
    next[activeVirusId] = { ...combat.mettaur, id: activeVirusId }
  }
  return next
}

const setupWaveViruses = (
  entities: Record<EntityId, EntityState>,
  wave: number,
  virusesTotal: number
): Record<EntityId, EntityState> => {
  const next = { ...entities }
  virusEntityIds.forEach((id, index) => {
    if (index < virusesTotal) {
      const hp = getWaveVirusSpawnHp(wave, index + 1)
      const position = virusSpawnPositions[index]
      next[id] = {
        ...next[id],
        id,
        name: 'Mettaur',
        alive: true,
        hp,
        maxHp: hp,
        position,
        hitFlashTicks: 0
      }
    } else {
      next[id] = {
        ...next[id],
        id,
        name: 'Mettaur',
        alive: false,
        hp: 0,
        maxHp: next[id].maxHp || 90,
        hitFlashTicks: 0
      }
    }
  })

  return next
}

const createInitialVirusAi = (): VirusAiById =>
  virusEntityIds.reduce((acc, virusId) => {
    acc[virusId] = {
      attackCooldown: mettaurAttackCadenceTicks,
      telegraphTicksRemaining: 0,
      recoveryTicks: 0,
      moveCooldown: mettaurMoveCadenceTicks
    }
    return acc
  }, {} as VirusAiById)

const resetVirusAiForWave = (virusAi: VirusAiById, entities: Record<EntityId, EntityState>): VirusAiById => {
  const next = { ...virusAi }
  virusEntityIds.forEach((virusId) => {
    next[virusId] = entities[virusId].alive
      ? {
          attackCooldown: mettaurAttackCadenceTicks,
          telegraphTicksRemaining: 0,
          recoveryTicks: 0,
          moveCooldown: mettaurMoveCadenceTicks
        }
      : {
          attackCooldown: mettaurAttackCadenceTicks,
          telegraphTicksRemaining: 0,
          recoveryTicks: 0,
          moveCooldown: 0
        }
  })
  return next
}

const summarizeVirusAi = (
  entities: Record<EntityId, EntityState>,
  virusAi: VirusAiById
): Pick<GameState, 'mettaurAttackCooldown' | 'mettaurTelegraphTicksRemaining' | 'mettaurRecoveryTicks' | 'mettaurMoveCooldown'> => {
  const activeVirusId = getActiveVirusId(entities)
  if (!activeVirusId) {
    return {
      mettaurAttackCooldown: mettaurAttackCadenceTicks,
      mettaurTelegraphTicksRemaining: 0,
      mettaurRecoveryTicks: 0,
      mettaurMoveCooldown: mettaurMoveCadenceTicks
    }
  }

  const ai = virusAi[activeVirusId]
  return {
    mettaurAttackCooldown: ai.attackCooldown,
    mettaurTelegraphTicksRemaining: ai.telegraphTicksRemaining,
    mettaurRecoveryTicks: ai.recoveryTicks,
    mettaurMoveCooldown: ai.moveCooldown
  }
}

const randomCode = (): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ*'
  return alphabet[Math.floor(Math.random() * alphabet.length)]
}

const formatDeleteTime = (ticks: number): string => {
  const clamped = Math.max(0, ticks)
  const totalCentiseconds = clamped * 10
  const minutes = Math.floor(totalCentiseconds / 6000)
  const seconds = Math.floor((totalCentiseconds % 6000) / 100)
  const centiseconds = totalCentiseconds % 100
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(centiseconds).padStart(2, '0')}`
}

const computeBustingLv = (deleteTicks: number, megamanHpRatio: number): number => {
  let score = 10
  if (deleteTicks > 180) score -= 4
  else if (deleteTicks > 120) score -= 3
  else if (deleteTicks > 80) score -= 2
  else if (deleteTicks > 50) score -= 1

  if (megamanHpRatio < 0.35) score -= 3
  else if (megamanHpRatio < 0.6) score -= 2
  else if (megamanHpRatio < 0.85) score -= 1

  return Math.max(1, Math.min(10, score))
}

const rollWaveReward = (bustingLv: number): WaveReward => {
  const highBustingChipThreshold = 8

  if (bustingLv >= highBustingChipThreshold && Math.random() < 0.6) {
    const chipIds = Object.keys(chipCatalog).filter((id) => id !== 'zcannon') as ChipRuntimeId[]
    const picked = chipIds[Math.floor(Math.random() * chipIds.length)]
    return {
      zenny: 0,
      chips: [
        {
          id: picked,
          name: chipCatalog[picked].name,
          code: randomCode()
        }
      ]
    }
  }

  const zenny = 80 + bustingLv * 35 + Math.floor(Math.random() * 90)
  return { zenny, chips: [] }
}

const getChipMb = (chip: BattleChip): number => chipCatalog[chip.id].mb
const getFolderTotalMb = (folder: BattleChip[]): number => folder.reduce((sum, chip) => sum + getChipMb(chip), 0)

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

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parseEffectNumber = (effects: string, prefix: string): number | null => {
  const match = effects.match(new RegExp(`${escapeRegex(prefix)}(-?\\d+)`))
  if (!match) {
    return null
  }

  return Number.parseInt(match[1], 10)
}

const splitEffectChain = (effects: string): string[] =>
  effects
    .split(',')
    .map((effect) => effect.trim())
    .filter((effect) => effect.length > 0)

const parseOffsetPairs = (encodedOffsets: string): PanelPosition[] =>
  encodedOffsets
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

const parseEffectOffsets = (effect: string, key: 'melee' | 'throw'): PanelPosition[] => {
  const prefix = `${key}:offsets=`
  const startIndex = effect.indexOf(prefix)
  if (startIndex < 0) {
    return []
  }

  const encodedOffsets = effect.slice(startIndex + prefix.length)
  return parseOffsetPairs(encodedOffsets)
}

const parseStepOffset = (effect: string): PanelPosition | null => {
  const match = effect.match(/step:offset=(-?\d+)\|(-?\d+)/)
  if (!match) {
    return null
  }

  return {
    row: Number.parseInt(match[2], 10),
    col: Number.parseInt(match[1], 10)
  }
}

const parseHitscanRows = (effect: string): number[] => {
  const rowsStart = effect.indexOf('hitscan:rows=')
  if (rowsStart < 0) {
    return []
  }

  const body = effect.slice(rowsStart + 'hitscan:rows='.length)
  return body
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith('maxRange=') && !part.startsWith('pierce='))
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
}

const clampPanelPosition = (position: PanelPosition): PanelPosition => ({
  row: Math.max(0, Math.min(boardRowCount - 1, position.row)),
  col: Math.max(0, Math.min(boardColCount - 1, position.col))
})

const canOffsetPatternHitTarget = (source: EntityState, target: EntityState, offsets: PanelPosition[]): boolean =>
  offsets.some((offset) => {
    const targetPanel = {
      row: source.position.row + offset.row,
      col: source.position.col + offset.col
    }

    return targetPanel.row === target.position.row && targetPanel.col === target.position.col
  })

const canHitscanHitTarget = (source: EntityState, target: EntityState, effect: string): boolean => {
  const rowOffsets = parseHitscanRows(effect)
  const maxRange = parseEffectNumber(effect, 'maxRange=') ?? 6
  const colDelta = target.position.col - source.position.col
  if (colDelta <= 0 || colDelta > maxRange) {
    return false
  }

  const rowDelta = target.position.row - source.position.row
  if (!rowOffsets.includes(rowDelta)) {
    return false
  }

  return true
}

const applyStepOffset = (source: EntityState, blocker: EntityState, effect: string): EntityState => {
  const stepOffset = parseStepOffset(effect)
  if (!stepOffset) {
    return source
  }

  const targetPosition = clampPanelPosition({
    row: source.position.row + stepOffset.row,
    col: source.position.col + stepOffset.col
  })

  if (targetPosition.row === blocker.position.row && targetPosition.col === blocker.position.col) {
    return source
  }

  return {
    ...source,
    position: targetPosition
  }
}

const canChipDamageHitTarget = (chipDefinition: { effects: string }, megaman: EntityState, mettaur: EntityState): boolean => {
  const effectChain = splitEffectChain(chipDefinition.effects)

  let currentSource = megaman
  let hasOffensiveEffect = false

  for (const effect of effectChain) {
    if (effect.startsWith('step:offset=')) {
      currentSource = applyStepOffset(currentSource, mettaur, effect)
      continue
    }

    if (effect.startsWith('melee:offsets=')) {
      hasOffensiveEffect = true
      if (canOffsetPatternHitTarget(currentSource, mettaur, parseEffectOffsets(effect, 'melee'))) {
        return true
      }
      continue
    }

    if (effect.startsWith('throw:offsets=')) {
      hasOffensiveEffect = true
      if (canOffsetPatternHitTarget(currentSource, mettaur, parseEffectOffsets(effect, 'throw'))) {
        return true
      }
      continue
    }

    if (effect.startsWith('hitscan:rows=')) {
      hasOffensiveEffect = true
      if (canHitscanHitTarget(currentSource, mettaur, effect)) {
        return true
      }
    }
  }

  return !hasOffensiveEffect
}

const collectChipIndicatorPanels = (effects: string, megaman: EntityState, mettaur: EntityState): string[] => {
  const effectChain = splitEffectChain(effects)
  const indicatorPanels = new Set<string>()
  let currentSource = megaman

  effectChain.forEach((effect) => {
    if (effect.startsWith('step:offset=')) {
      currentSource = applyStepOffset(currentSource, mettaur, effect)
      return
    }

    if (effect.startsWith('melee:offsets=')) {
      parseEffectOffsets(effect, 'melee').forEach((offset) => {
        const row = currentSource.position.row + offset.row
        const col = currentSource.position.col + offset.col
        if (row >= 0 && row < boardRowCount && col >= 0 && col < boardColCount) {
          indicatorPanels.add(makePanelKey({ row, col }))
        }
      })
      return
    }

    if (effect.startsWith('throw:offsets=')) {
      parseEffectOffsets(effect, 'throw').forEach((offset) => {
        const row = currentSource.position.row + offset.row
        const col = currentSource.position.col + offset.col
        if (row >= 0 && row < boardRowCount && col >= 0 && col < boardColCount) {
          indicatorPanels.add(makePanelKey({ row, col }))
        }
      })
      return
    }

    if (effect.startsWith('hitscan:rows=')) {
      const rows = parseHitscanRows(effect)
      const maxRange = parseEffectNumber(effect, 'maxRange=') ?? 6
      rows.forEach((rowOffset) => {
        const targetRow = currentSource.position.row + rowOffset
        if (targetRow < 0 || targetRow >= boardRowCount) {
          return
        }
        for (let range = 1; range <= maxRange; range += 1) {
          const targetCol = currentSource.position.col + range
          if (targetCol < 0 || targetCol >= boardColCount) {
            break
          }
          indicatorPanels.add(makePanelKey({ row: targetRow, col: targetCol }))
        }
      })
    }
  })

  return Array.from(indicatorPanels)
}

const resolveChipExecutionSource = (
  entities: Record<EntityId, EntityState>,
  effects: string
): { entities: Record<EntityId, EntityState>; didStep: boolean; originalMegaman: EntityState } => {
  const originalMegaman = entities.megaman
  let steppedMegaman = originalMegaman

  splitEffectChain(effects).forEach((effect) => {
    if (effect.startsWith('step:offset=')) {
      steppedMegaman = applyStepOffset(steppedMegaman, entities.mettaur, effect)
    }
  })

  const didStep =
    steppedMegaman.position.row !== originalMegaman.position.row || steppedMegaman.position.col !== originalMegaman.position.col

  if (!didStep) {
    return { entities, didStep: false, originalMegaman }
  }

  return {
    entities: {
      ...entities,
      megaman: steppedMegaman
    },
    didStep: true,
    originalMegaman
  }
}

const starterFolder: BattleChip[] = [
  { id: 'cannon', name: 'Cannon', code: 'A' },
  { id: 'cannon', name: 'Cannon', code: 'B' },
  { id: 'cannon', name: 'Cannon', code: 'C' },
  { id: 'cannon', name: 'Cannon', code: '*' },
  { id: 'cannon', name: 'Cannon', code: 'L' },
  { id: 'cannon', name: 'Cannon', code: 'A' },
  { id: 'cannon', name: 'Cannon', code: 'B' },
  { id: 'cannon', name: 'Cannon', code: 'C' },
  { id: 'cannon', name: 'Cannon', code: '*' },
  { id: 'cannon', name: 'Cannon', code: 'L' },
  { id: 'recover10', name: 'Recover10', code: 'A' },
  { id: 'recover10', name: 'Recover10', code: 'B' },
  { id: 'recover10', name: 'Recover10', code: 'C' },
  { id: 'recover10', name: 'Recover10', code: 'D' },
  { id: 'recover10', name: 'Recover10', code: 'E' },
  { id: 'recover10', name: 'Recover10', code: 'F' },
  { id: 'recover10', name: 'Recover10', code: 'G' },
  { id: 'recover10', name: 'Recover10', code: 'H' },
  { id: 'recover10', name: 'Recover10', code: 'I' },
  { id: 'recover10', name: 'Recover10', code: 'J' },
  { id: 'recover30', name: 'Recover30', code: 'A' },
  { id: 'recover30', name: 'Recover30', code: 'B' },
  { id: 'recover30', name: 'Recover30', code: 'C' },
  { id: 'recover30', name: 'Recover30', code: 'D' },
  { id: 'recover30', name: 'Recover30', code: 'E' },
  { id: 'barrier', name: 'Barrier', code: '*' },
  { id: 'barrier', name: 'Barrier', code: 'A' },
  { id: 'barrier', name: 'Barrier', code: 'B' },
  { id: 'barrier', name: 'Barrier', code: 'C' },
  { id: 'barrier', name: 'Barrier', code: 'D' }
]

const starterStock: BattleChip[] = [
  ...starterFolder,
  { id: 'cannon', name: 'Cannon', code: 'A' },
  { id: 'hicannon', name: 'HiCannon', code: 'L' },
  { id: 'hicannon', name: 'HiCannon', code: 'A' },
  { id: 'm-cannon', name: 'M-Cannon', code: 'A' },
  { id: 'sword', name: 'Sword', code: 'A' },
  { id: 'widesword', name: 'WideSword', code: 'A' },
  { id: 'widesword', name: 'WideSword', code: 'B' },
  { id: 'longsword', name: 'LongSword', code: 'A' },
  { id: 'longsword', name: 'LongSword', code: 'L' },
  { id: 'spreader', name: 'Spreader', code: 'L' },
  { id: 'spreader', name: 'Spreader', code: 'A' },
  { id: 'minibomb', name: 'MiniBomb', code: '*' },
  { id: 'minibomb', name: 'MiniBomb', code: 'B' },
  { id: 'lilbomb', name: 'LilBomb', code: 'B' },
  { id: 'stepsword', name: 'StepSword', code: 'S' },
  { id: 'recover10', name: 'Recover10', code: 'L' },
  { id: 'recover30', name: 'Recover30', code: 'L' },
  { id: 'recover30', name: 'Recover30', code: 'A' },
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
    alive: false,
    hp: 0,
    maxHp: 90,
    hitFlashTicks: 0
  },
  mettaur2: {
    id: 'mettaur2',
    name: 'Mettaur',
    position: { row: 0, col: 4 },
    alive: false,
    hp: 0,
    maxHp: 90,
    hitFlashTicks: 0
  },
  mettaur3: {
    id: 'mettaur3',
    name: 'Mettaur',
    position: { row: 2, col: 4 },
    alive: false,
    hp: 0,
    maxHp: 90,
    hitFlashTicks: 0
  },
  mettaur4: {
    id: 'mettaur4',
    name: 'Mettaur',
    position: { row: 0, col: 5 },
    alive: false,
    hp: 0,
    maxHp: 90,
    hitFlashTicks: 0
  },
  mettaur5: {
    id: 'mettaur5',
    name: 'Mettaur',
    position: { row: 1, col: 5 },
    alive: false,
    hp: 0,
    maxHp: 90,
    hitFlashTicks: 0
  },
  mettaur6: {
    id: 'mettaur6',
    name: 'Mettaur',
    position: { row: 2, col: 5 },
    alive: false,
    hp: 0,
    maxHp: 90,
    hitFlashTicks: 0
  }
})

const sortChipCollection = (chips: BattleChip[]): BattleChip[] =>
  [...chips].sort((a, b) => {
    if (a.name !== b.name) {
      return a.name.localeCompare(b.name)
    }

    if (a.code !== b.code) {
      return a.code.localeCompare(b.code)
    }

    return a.id.localeCompare(b.id)
  })

const fillHandSlots = (
  hand: Array<BattleChip | null>,
  deck: BattleChip[],
  discard: BattleChip[],
  reshuffleSeed: number
): { chipHand: Array<BattleChip | null>; chipDeck: BattleChip[]; chipDiscard: BattleChip[] } => {
  const nextHand = [...hand]
  let nextDeck = [...deck]
  let nextDiscard = [...discard]

  for (let slot = 0; slot < nextHand.length; slot += 1) {
    if (nextHand[slot]) {
      continue
    }

    if (nextDeck.length === 0 && nextDiscard.length > 0) {
      nextDeck = shuffleChipsDeterministic(nextDiscard, reshuffleSeed)
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
  discard: BattleChip[],
  reshuffleSeed: number
): { chipDeck: BattleChip[]; chipDiscard: BattleChip[]; didRecycle: boolean } => {
  if (deck.length > 0 || discard.length === 0) {
    return { chipDeck: deck, chipDiscard: discard, didRecycle: false }
  }

  return {
    chipDeck: shuffleChipsDeterministic(discard, reshuffleSeed),
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


const buildMettaurSwingHitboxPanels = (
  entities: Record<EntityId, EntityState>,
  virusAi: VirusAiById,
  activeVirusId: VirusEntityId | null
): string[] => {
  if (!activeVirusId) {
    return []
  }

  const mettaur = entities[activeVirusId]
  if (!mettaur.alive || virusAi[activeVirusId].telegraphTicksRemaining <= 0) {
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

type CombatSummaryRuntime = {
  virusAi: VirusAiById
  customGaugeTicks: number
  customGaugeMaxTicks: number
  chipHand: Array<BattleChip | null>
  barrierCharges: number
  megamanHitstunTicks: number
  queuedChipSlot: number | null
  megamanControlMode: MegamanControlMode
  programAdvanceAnimation: ProgramAdvanceAnimation | null
  chipIndicatorPanels: string[]
  currentLevel: number
  currentWave: number
  waveStatus: WaveStatus
  waveResult?: WaveResultSummary | null
  battleStartBannerTicks?: number
  totalZenny?: number
  virusesRemaining?: number
  virusesTotal?: number
}

const buildCombatSummary = (
  entities: Record<EntityId, EntityState>,
  runtime: CombatSummaryRuntime,
  lastEvent: string
): CombatSummary => {
  const player = entities.megaman
  const activeVirusId = getActiveVirusId(entities)
  const target = activeVirusId ? entities[activeVirusId] : entities.mettaur

  return {
    playerHp: player.hp,
    playerMaxHp: player.maxHp,
    targetId: target.id,
    targetHp: target.hp,
    targetMaxHp: target.maxHp,
    mettaurTelegraphTicksRemaining: activeVirusId ? runtime.virusAi[activeVirusId].telegraphTicksRemaining : 0,
    customGaugeTicks: runtime.customGaugeTicks,
    customGaugeMaxTicks: runtime.customGaugeMaxTicks,
    chipHand: runtime.chipHand,
    barrierCharges: runtime.barrierCharges,
    megamanHitstunTicks: runtime.megamanHitstunTicks,
    queuedChipSlot: runtime.queuedChipSlot,
    megamanControlMode: runtime.megamanControlMode,
    programAdvanceAnimation: runtime.programAdvanceAnimation,
    lastEvent,
    activeHitboxPanels: buildMettaurSwingHitboxPanels(entities, runtime.virusAi, activeVirusId),
    chipIndicatorPanels: runtime.chipIndicatorPanels,
    currentLevel: runtime.currentLevel,
    currentWave: runtime.currentWave,
    isBossWave: isBossWave(runtime.currentWave),
    waveStatus: runtime.waveStatus,
    waveResult: runtime.waveResult ?? null,
    battleStartBannerTicks: runtime.battleStartBannerTicks ?? 0,
    totalZenny: runtime.totalZenny ?? 0,
    virusesRemaining: runtime.virusesRemaining ?? getAliveVirusIds(entities).length,
    virusesTotal: runtime.virusesTotal ?? Math.max(1, getAliveVirusIds(entities).length)
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
  chipIndicatorPanels: string[]
  pendingStepReturnPosition: PanelPosition | null
  pendingStepReturnTicks: number
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
      chipIndicatorPanels: [],
      pendingStepReturnPosition: null,
      pendingStepReturnTicks: 0,
      lastEvent: 'Selected chip slot is empty',
      used: false,
      megamanRecoveryTicks: 0
    }
  }

  const chipDefinition = chipCatalog[chip.id]
  let nextEntities = { ...current.entities }
  const { combatEntities, activeVirusId } = projectCombatEntities(nextEntities)
  let combatState = combatEntities
  let barrierCharges = current.barrierCharges
  const sourceResolution = resolveChipExecutionSource(combatState, chipDefinition.effects)
  combatState = sourceResolution.entities
  const chipIndicatorPanels = collectChipIndicatorPanels(chipDefinition.effects, combatState.megaman, combatState.mettaur)
  const pendingStepReturnPosition = sourceResolution.didStep ? sourceResolution.originalMegaman.position : null
  let lastEvent = `Chip used: ${chip.name} ${chip.code}`
  let megamanRecoveryTicks = chipDefinition.recoilTicks

  if (chipDefinition.damage > 0) {
    const canHit = canChipDamageHitTarget(chipDefinition, combatState.megaman, combatState.mettaur)
    if (canHit) {
      const result = applyDamage(combatState.megaman, combatState.mettaur, chipDefinition.damage)
      combatState = {
        ...combatState,
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
    const nextHp = Math.min(combatState.megaman.maxHp, combatState.megaman.hp + healAmount)
    const healedAmount = nextHp - combatState.megaman.hp
    combatState = {
      ...combatState,
      megaman: {
        ...combatState.megaman,
        hp: nextHp,
        alive: nextHp > 0
      }
    }
    lastEvent = `${chip.name} healed ${healedAmount}`
  }

  nextEntities = mergeCombatEntities(nextEntities, combatState, activeVirusId)

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
    chipIndicatorPanels,
    pendingStepReturnPosition,
    pendingStepReturnTicks: sourceResolution.didStep ? megamanRecoveryTicks : 0,
    lastEvent,
    used: true,
    megamanRecoveryTicks
  }
}

const isOffensiveChip = (effects: string): boolean => {
  const effectChain = splitEffectChain(effects)
  return effectChain.some(
    (effect) => effect.startsWith('melee:offsets=') || effect.startsWith('throw:offsets=') || effect.startsWith('hitscan:rows=')
  )
}

const chooseAutoChipSlot = (state: Pick<GameState, 'chipHand' | 'entities' | 'barrierCharges'>): number | null => {
  const { chipHand, entities, barrierCharges } = state
  const playerHpRatio = entities.megaman.maxHp > 0 ? entities.megaman.hp / entities.megaman.maxHp : 0

  const paSlot = chipHand.findIndex((chip) => chip?.id === 'zcannon')
  if (paSlot >= 0) {
    return paSlot
  }

  if (playerHpRatio <= autoRecoverHpThreshold) {
    const recoverSlot = chipHand.findIndex((chip) => chip?.id === 'recover10' || chip?.id === 'recover30')
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

  let bestSlot: number | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  chipHand.forEach((chip, index) => {
    if (!chip) {
      return
    }

    const chipDefinition = chipCatalog[chip.id]
    if (!chipDefinition || !isOffensiveChip(chipDefinition.effects) || chipDefinition.damage <= 0) {
      return
    }

    const canHit = canChipDamageHitTarget(chipDefinition, entities.megaman, entities.mettaur)

    let score = chipDefinition.damage
    if (!canHit) {
      score -= 1000
    }

    if (chip.id === 'stepsword') {
      score += 12
    } else if (chip.id === 'sword' || chip.id === 'widesword' || chip.id === 'longsword') {
      score += 6
    }

    if (score > bestScore) {
      bestScore = score
      bestSlot = index
    }
  })

  if (bestSlot !== null) {
    return bestSlot
  }

  return chipHand.findIndex((chip) => chip !== null)
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

const chooseVirusAutoMove = (
  entities: Record<EntityId, EntityState>,
  virusId: VirusEntityId,
  state: { megamanBusterCooldown: number; telegraphTicksRemaining: number }
): PanelPosition => {
  const mettaur = entities[virusId]
  const megaman = entities.megaman

  const candidates: PanelPosition[] = [
    mettaur.position,
    { row: mettaur.position.row - 1, col: mettaur.position.col },
    { row: mettaur.position.row + 1, col: mettaur.position.col },
    { row: mettaur.position.row, col: mettaur.position.col - 1 },
    { row: mettaur.position.row, col: mettaur.position.col + 1 }
  ].filter(inEnemyArea)

  const megamanBusterSoon = state.megamanBusterCooldown <= 2
  const inTelegraph = state.telegraphTicksRemaining > 0

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
  | 'virusAi'
  | 'occupiedPanels'
  | 'combat'
  | 'megamanBusterCooldown'
  | 'mettaurAttackCooldown'
  | 'mettaurTelegraphTicksRemaining'
  | 'mettaurRespawnTick'
  | 'currentLevel'
  | 'currentWave'
  | 'waveStatus'
  | 'waveTransitionTick'
  | 'waveStartedAtTick'
  | 'waveResult'
  | 'battleStartBannerTicks'
  | 'totalZenny'
  | 'virusesRemaining'
  | 'virusesTotal'
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
  | 'pendingStepReturnPosition'
  | 'pendingStepReturnTicks'
  | 'autoChipCooldown'
  | 'megamanControlMode'
  | 'megamanAutoMoveCooldown'
  | 'mettaurMoveCooldown'
  | 'programAdvanceAnimation'
  | 'forceProgramAdvanceOnNextCustomDraw'
  | 'chipIndicatorPanels'
  | 'chipIndicatorTicksRemaining'
  | 'debugCompleteWaveRequested'
>

const buildInitialState = (): RuntimeState => {
  let entities = createInitialEntities()
  const initialLevel = 1
  const initialWave = 1
  const initialVirusesTotal = getWaveVirusCount(initialWave)
  entities = setupWaveViruses(entities, initialWave, initialVirusesTotal)
  let virusAi = createInitialVirusAi()
  virusAi = resetVirusAiForWave(virusAi, entities)
  const initialDeck = shuffleChipsDeterministic(starterFolder, 1)
  const initialHand = Array.from({ length: defaultChipHandSize }, () => null as BattleChip | null)
  const firstFill = fillHandSlots(initialHand, initialDeck, [], 1)

  const runtime: Omit<RuntimeState, 'ticks' | 'entities' | 'occupiedPanels' | 'combat'> = {
    megamanBusterCooldown: megamanBusterCadenceTicks,
    mettaurAttackCooldown: mettaurAttackCadenceTicks,
    mettaurTelegraphTicksRemaining: 0,
    mettaurRespawnTick: null,
    currentLevel: initialLevel,
    currentWave: initialWave,
    waveStatus: 'inProgress',
    waveTransitionTick: null,
    waveStartedAtTick: 0,
    waveResult: null,
    battleStartBannerTicks: battleStartBannerDurationTicks,
    totalZenny: 0,
    virusesRemaining: initialVirusesTotal,
    virusesTotal: initialVirusesTotal,
    customGaugeTicks: 0,
    customGaugeMaxTicks,
    chipHandSize: defaultChipHandSize,
    chipFolder: sortChipCollection(starterFolder),
    chipStock: sortChipCollection(starterStock),
    chipHand: firstFill.chipHand,
    chipDeck: firstFill.chipDeck,
    chipDiscard: firstFill.chipDiscard,
    queuedChipSlot: null,
    barrierCharges: 0,
    megamanHitstunTicks: 0,
    megamanRecoveryTicks: 0,
    mettaurRecoveryTicks: 0,
    pendingStepReturnPosition: null,
    pendingStepReturnTicks: 0,
    autoChipCooldown: autoChipCadenceTicks,
    megamanControlMode: 'semiAuto',
    megamanAutoMoveCooldown: megamanAutoMoveCadenceTicks,
    mettaurMoveCooldown: mettaurMoveCadenceTicks,
    virusAi,
    programAdvanceAnimation: null,
    forceProgramAdvanceOnNextCustomDraw: false,
    chipIndicatorPanels: [],
    chipIndicatorTicksRemaining: 0,
    debugCompleteWaveRequested: false
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
  moveFolderChipToStock: (index) => {
    set((current) => {
      if (index < 0 || index >= current.chipFolder.length) {
        return {}
      }

      const movingChip = current.chipFolder[index]
      const nextFolder = sortChipCollection(current.chipFolder.filter((_, chipIndex) => chipIndex !== index))
      const nextStock = sortChipCollection([...current.chipStock, movingChip])
      let removedFromDeck = false
      let removedFromDiscard = false
      let removedFromHand = false

      const nextDeck = current.chipDeck.filter((chip) => {
        if (!removedFromDeck && chip.id === movingChip.id && chip.code === movingChip.code) {
          removedFromDeck = true
          return false
        }
        return true
      })

      const nextDiscard = current.chipDiscard.filter((chip) => {
        if (!removedFromDiscard && chip.id === movingChip.id && chip.code === movingChip.code) {
          removedFromDiscard = true
          return false
        }
        return true
      })

      const nextHand = current.chipHand.map((chip) => {
        if (!removedFromHand && chip && chip.id === movingChip.id && chip.code === movingChip.code) {
          removedFromHand = true
          return null
        }
        return chip
      })

      return {
        chipFolder: nextFolder,
        chipStock: nextStock,
        chipDeck: nextDeck,
        chipDiscard: nextDiscard,
        chipHand: nextHand
      }
    })
  },
  moveStockChipToFolder: (chipId, code) => {
    set((current) => {
      if (current.chipFolder.length >= 30) {
        return {}
      }

      const stockIndex = current.chipStock.findIndex((chip) => chip.id === chipId && chip.code === code)
      if (stockIndex < 0) {
        return {}
      }

      const movingChip = current.chipStock[stockIndex]
      const nextFolderMb = getFolderTotalMb(current.chipFolder) + getChipMb(movingChip)
      if (nextFolderMb > folderMbLimit) {
        return {}
      }

      const nextStock = sortChipCollection(current.chipStock.filter((_, chipIndex) => chipIndex !== stockIndex))
      const nextFolder = sortChipCollection([...current.chipFolder, movingChip])
      const nextDiscard = [...current.chipDiscard, movingChip]

      return {
        chipFolder: nextFolder,
        chipStock: nextStock,
        chipDiscard: nextDiscard
      }
    })
  },
  debugCompleteCurrentWave: () => {
    set((current) => {
      const runtime = {
        virusAi: current.virusAi,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: current.queuedChipSlot,
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation,
        chipIndicatorPanels: current.chipIndicatorPanels,
        currentLevel: current.currentLevel,
        currentWave: current.currentWave,
        waveStatus: current.waveStatus,
        waveResult: current.waveResult,
        battleStartBannerTicks: current.battleStartBannerTicks,
        totalZenny: current.totalZenny,
        virusesRemaining: current.virusesRemaining,
        virusesTotal: current.virusesTotal
      }

      return {
        debugCompleteWaveRequested: true,
        combat: buildCombatSummary(current.entities, runtime, 'Debug: complete current wave requested')
      }
    })
  },
  debugForceNextCustomDrawProgramAdvance: () => {
    set((current) => {
      const runtime = {
        virusAi: current.virusAi,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: current.queuedChipSlot,
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation,
        chipIndicatorPanels: current.chipIndicatorPanels,
        currentLevel: current.currentLevel,
        currentWave: current.currentWave,
        waveStatus: current.waveStatus
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
      const sanitizedQueuedChipSlot = sanitizeQueuedChipSlot(current.chipHand, current.queuedChipSlot)
      const runtime = {
        virusAi: current.virusAi,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: sanitizedQueuedChipSlot,
        megamanControlMode: nextMode,
        programAdvanceAnimation: current.programAdvanceAnimation,
        chipIndicatorPanels: current.chipIndicatorPanels,
        currentLevel: current.currentLevel,
        currentWave: current.currentWave,
        waveStatus: current.waveStatus
      }

      return {
        megamanControlMode: nextMode,
        queuedChipSlot: sanitizedQueuedChipSlot,
        combat: buildCombatSummary(current.entities, runtime, `Control mode set to ${nextMode}`)
      }
    })
  },
  movePlayer: (deltaRow, deltaCol) => {
    set((current) => {
      if (current.megamanControlMode !== 'manual' || current.waveResult !== null || current.battleStartBannerTicks > 0) {
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
        virusAi: current.virusAi,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: current.queuedChipSlot,
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation,
        chipIndicatorPanels: current.chipIndicatorPanels,
        currentLevel: current.currentLevel,
        currentWave: current.currentWave,
        waveStatus: current.waveStatus
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

      if (current.waveResult !== null || current.battleStartBannerTicks > 0) {
        return {
          combat: buildCombatSummary(current.entities, {
            virusAi: current.virusAi,
            customGaugeTicks: current.customGaugeTicks,
            customGaugeMaxTicks: current.customGaugeMaxTicks,
            chipHand: current.chipHand,
            barrierCharges: current.barrierCharges,
            megamanHitstunTicks: current.megamanHitstunTicks,
            queuedChipSlot: current.queuedChipSlot,
            megamanControlMode: current.megamanControlMode,
            programAdvanceAnimation: current.programAdvanceAnimation,
            chipIndicatorPanels: current.chipIndicatorPanels,
            currentLevel: current.currentLevel,
            currentWave: current.currentWave,
            waveStatus: current.waveStatus,
            waveResult: current.waveResult,
            battleStartBannerTicks: current.battleStartBannerTicks,
            totalZenny: current.totalZenny
          }, 'Battle paused for results/start banner')
        }
      }

      const megamanBusy = !current.entities.megaman.alive || current.megamanHitstunTicks > 0 || current.megamanRecoveryTicks > 0

      if (megamanBusy) {
        const bufferedSlot = sanitizeQueuedChipSlot(current.chipHand, index)
        const runtime = {
          virusAi: current.virusAi,
          customGaugeTicks: current.customGaugeTicks,
          customGaugeMaxTicks: current.customGaugeMaxTicks,
          chipHand: current.chipHand,
          barrierCharges: current.barrierCharges,
          megamanHitstunTicks: current.megamanHitstunTicks,
          queuedChipSlot: bufferedSlot,
          megamanControlMode: current.megamanControlMode,
          programAdvanceAnimation: current.programAdvanceAnimation,
          chipIndicatorPanels: current.chipIndicatorPanels,
          currentLevel: current.currentLevel,
          currentWave: current.currentWave,
          waveStatus: current.waveStatus
        }

        return {
          queuedChipSlot: bufferedSlot,
          combat: buildCombatSummary(
            current.entities,
            runtime,
            bufferedSlot === null
              ? 'Cannot buffer empty chip slot'
              : `Buffered ${current.chipHand[index]?.name ?? 'empty slot'} for next action`
          )
        }
      }

      const result = tryUseChipFromSlot(current, index)
      if (!result.used) {
        const runtime = {
          virusAi: current.virusAi,
          customGaugeTicks: current.customGaugeTicks,
          customGaugeMaxTicks: current.customGaugeMaxTicks,
          chipHand: current.chipHand,
          barrierCharges: current.barrierCharges,
          megamanHitstunTicks: current.megamanHitstunTicks,
          queuedChipSlot: current.queuedChipSlot,
          megamanControlMode: current.megamanControlMode,
          programAdvanceAnimation: current.programAdvanceAnimation,
          chipIndicatorPanels: current.chipIndicatorPanels,
          currentLevel: current.currentLevel,
          currentWave: current.currentWave,
          waveStatus: current.waveStatus
        }

        return {
          combat: buildCombatSummary(current.entities, runtime, result.lastEvent)
        }
      }

      const runtime = {
        virusAi: current.virusAi,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: result.chipHand,
        barrierCharges: result.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: null,
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation,
        chipIndicatorPanels: result.chipIndicatorPanels,
        currentLevel: current.currentLevel,
        currentWave: current.currentWave,
        waveStatus: current.waveStatus
      }

      return {
        entities: result.entities,
        occupiedPanels: buildOccupiedPanels(result.entities),
        chipHand: result.chipHand,
        chipDiscard: result.chipDiscard,
        barrierCharges: result.barrierCharges,
        queuedChipSlot: null,
        megamanRecoveryTicks: result.megamanRecoveryTicks,
        pendingStepReturnPosition: result.pendingStepReturnPosition,
        pendingStepReturnTicks: result.pendingStepReturnTicks,
        chipIndicatorPanels: result.chipIndicatorPanels,
        chipIndicatorTicksRemaining: chipIndicatorDurationTicks,
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
      if (current.waveResult !== null || current.battleStartBannerTicks > 0 || current.megamanControlMode !== 'manual' || current.megamanBusterCooldown > 0 || current.megamanRecoveryTicks > 0) {
        return {}
      }

      const { combatEntities, activeVirusId } = projectCombatEntities(current.entities)
      const canHit = canMegamanBusterHit(combatEntities.megaman, combatEntities.mettaur)
      const result = canHit
        ? applyDamage(combatEntities.megaman, combatEntities.mettaur, megamanHitDamage)
        : { source: combatEntities.megaman, target: combatEntities.mettaur, didHit: false }
      const nextEntities = mergeCombatEntities(
        current.entities,
        {
          ...combatEntities,
          megaman: result.source,
          mettaur: result.target
        },
        activeVirusId
      )
      const runtime = {
        virusAi: current.virusAi,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: current.queuedChipSlot,
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation,
        chipIndicatorPanels: current.chipIndicatorPanels,
        currentLevel: current.currentLevel,
        currentWave: current.currentWave,
        waveStatus: current.waveStatus
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
  closeWaveResult: () => {
    set((current) => {
      if (!current.waveResult) {
        return {}
      }

      let currentWave = current.currentWave
      let currentLevel = current.currentLevel
      let waveStatus = current.waveStatus
      let nextEntities = current.entities
      let virusAi = current.virusAi
      let waveStartedAtTick = current.waveStartedAtTick
      let battleStartBannerTicks = 0
      let virusesTotal = current.virusesTotal
      let virusesRemaining = current.virusesRemaining
      let lastEvent = `Wave ${current.waveResult.wave} results confirmed`

      if (current.waveStatus === 'waveCleared') {
        currentWave = Math.min(maxWavesPerLevel, current.currentWave + 1)
        virusesTotal = getWaveVirusCount(currentWave)
        virusesRemaining = virusesTotal
        nextEntities = setupWaveViruses(current.entities, currentWave, virusesTotal)
        waveStatus = 'inProgress'
        waveStartedAtTick = current.ticks
        battleStartBannerTicks = battleStartBannerDurationTicks
        virusAi = resetVirusAiForWave(virusAi, nextEntities)
        lastEvent = isBossWave(currentWave) ? 'BATTLE START — Boss wave' : 'BATTLE START'
      }

      const runtime = {
        virusAi,
        customGaugeTicks: current.customGaugeTicks,
        customGaugeMaxTicks: current.customGaugeMaxTicks,
        chipHand: current.chipHand,
        barrierCharges: current.barrierCharges,
        megamanHitstunTicks: current.megamanHitstunTicks,
        queuedChipSlot: current.queuedChipSlot,
        megamanControlMode: current.megamanControlMode,
        programAdvanceAnimation: current.programAdvanceAnimation,
        chipIndicatorPanels: current.chipIndicatorPanels,
        currentLevel,
        currentWave,
        waveStatus,
        waveResult: null,
        battleStartBannerTicks,
        totalZenny: current.totalZenny,
        virusesRemaining,
        virusesTotal
      }

      return {
        entities: nextEntities,
        occupiedPanels: buildOccupiedPanels(nextEntities),
        currentLevel,
        currentWave,
        waveStatus,
        waveTransitionTick: null,
        waveStartedAtTick,
        waveResult: null,
        battleStartBannerTicks,
        ...summarizeVirusAi(nextEntities, virusAi),
        virusAi,
        debugCompleteWaveRequested: false,
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
            }
          }
          virusEntityIds.forEach((virusId) => {
            nextEntities = {
              ...nextEntities,
              [virusId]: {
                ...nextEntities[virusId],
                hitFlashTicks: Math.max(0, nextEntities[virusId].hitFlashTicks - 1)
              }
            }
          })
          let megamanBusterCooldown = Math.max(0, current.megamanBusterCooldown - 1)
          let mettaurRespawnTick = current.mettaurRespawnTick
          let currentLevel = current.currentLevel
          let currentWave = current.currentWave
          let waveStatus = current.waveStatus
          let waveTransitionTick = current.waveTransitionTick
          let waveStartedAtTick = current.waveStartedAtTick
          let waveResult = current.waveResult
          let battleStartBannerTicks = Math.max(0, current.battleStartBannerTicks - 1)
          let totalZenny = current.totalZenny
          let virusesRemaining = current.virusesRemaining
          let virusesTotal = current.virusesTotal
          let debugCompleteWaveRequested = current.debugCompleteWaveRequested
          let virusAi: VirusAiById = { ...current.virusAi }
          virusEntityIds.forEach((virusId) => {
            const ai = virusAi[virusId]
            virusAi[virusId] = {
              attackCooldown: Math.max(0, ai.attackCooldown - 1),
              telegraphTicksRemaining: ai.telegraphTicksRemaining,
              recoveryTicks: Math.max(0, ai.recoveryTicks - 1),
              moveCooldown: Math.max(0, ai.moveCooldown - 1)
            }
          })
          const battlePaused = waveResult !== null || battleStartBannerTicks > 0
          let gaugeTicks = battlePaused ? current.customGaugeTicks : current.customGaugeTicks + 1
          let chipHand = current.chipHand
          let chipStock = current.chipStock
          let chipDeck = current.chipDeck
          let chipDiscard = current.chipDiscard
          const recycledDeck = battlePaused
            ? { chipDeck, chipDiscard, didRecycle: false }
            : recycleDeckIfEmpty(chipDeck, chipDiscard, nextTicks)
          chipDeck = recycledDeck.chipDeck
          chipDiscard = recycledDeck.chipDiscard
          let queuedChipSlot = current.queuedChipSlot
          let barrierCharges = current.barrierCharges
          let megamanHitstunTicks = Math.max(0, current.megamanHitstunTicks - 1)
          let megamanRecoveryTicks = Math.max(0, current.megamanRecoveryTicks - 1)
          let pendingStepReturnPosition = current.pendingStepReturnPosition
          let pendingStepReturnTicks = Math.max(0, current.pendingStepReturnTicks - 1)
          if (pendingStepReturnPosition && pendingStepReturnTicks === 0) {
            nextEntities = {
              ...nextEntities,
              megaman: {
                ...nextEntities.megaman,
                position: pendingStepReturnPosition
              }
            }
            pendingStepReturnPosition = null
          }
          let autoChipCooldown = Math.max(0, current.autoChipCooldown - 1)
          let megamanAutoMoveCooldown = Math.max(0, current.megamanAutoMoveCooldown - 1)
          let programAdvanceAnimation =
            current.programAdvanceAnimation && current.programAdvanceAnimation.ticksRemaining > 1
              ? { ...current.programAdvanceAnimation, ticksRemaining: current.programAdvanceAnimation.ticksRemaining - 1 }
              : null
          let forceProgramAdvanceOnNextCustomDraw = current.forceProgramAdvanceOnNextCustomDraw
          let chipIndicatorPanels = current.chipIndicatorPanels
          let chipIndicatorTicksRemaining = battlePaused ? current.chipIndicatorTicksRemaining : Math.max(0, current.chipIndicatorTicksRemaining - 1)
          if (chipIndicatorTicksRemaining === 0) {
            chipIndicatorPanels = []
          }
          const megamanControlMode = current.megamanControlMode
          if (battlePaused) {
            megamanBusterCooldown = current.megamanBusterCooldown
            megamanHitstunTicks = current.megamanHitstunTicks
            megamanRecoveryTicks = current.megamanRecoveryTicks
            pendingStepReturnTicks = current.pendingStepReturnTicks
            autoChipCooldown = current.autoChipCooldown
            megamanAutoMoveCooldown = current.megamanAutoMoveCooldown
            virusAi = current.virusAi
          }
          const combatActive = !battlePaused && waveStatus === 'inProgress'
          let lastEvent = waveResult ? `Wave ${waveResult.wave} clear results ready` : battleStartBannerTicks > 0 ? 'BATTLE START' : recycledDeck.didRecycle ? 'Deck recycled from discard pile' : 'Idle tick'

          if (!battlePaused && gaugeTicks >= current.customGaugeMaxTicks) {
            const refill = fillHandSlots(chipHand, chipDeck, chipDiscard, nextTicks)
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

          queuedChipSlot = sanitizeQueuedChipSlot(chipHand, queuedChipSlot)

          const megamanBusy = !nextEntities.megaman.alive || megamanHitstunTicks > 0 || megamanRecoveryTicks > 0

          if (combatActive && nextEntities.megaman.alive && megamanControlMode !== 'manual' && megamanAutoMoveCooldown === 0) {
            const mettaurThreatState = summarizeVirusAi(nextEntities, virusAi)
            const autoMove = chooseMegamanAutoMove(nextEntities, {
              mettaurTelegraphTicksRemaining: mettaurThreatState.mettaurTelegraphTicksRemaining,
              mettaurAttackCooldown: mettaurThreatState.mettaurAttackCooldown,
              megamanBusterCooldown
            })
            const movedEntities = moveEntityIfPossible(nextEntities, 'megaman', autoMove)
            if (movedEntities !== nextEntities) {
              nextEntities = movedEntities
              lastEvent = 'MegaMan repositioned'
            }
            megamanAutoMoveCooldown = megamanAutoMoveCadenceTicks
          }

          if (combatActive) {
            virusEntityIds.forEach((virusId) => {
              const virus = nextEntities[virusId]
              const ai = virusAi[virusId]
              if (!virus.alive || ai.moveCooldown > 0 || ai.telegraphTicksRemaining > 0 || ai.recoveryTicks > 0) {
                return
              }

              const autoMove = chooseVirusAutoMove(nextEntities, virusId, {
                megamanBusterCooldown,
                telegraphTicksRemaining: ai.telegraphTicksRemaining
              })
              const movedEntities = moveEntityIfPossible(nextEntities, virusId, autoMove)
              if (movedEntities !== nextEntities) {
                nextEntities = movedEntities
                lastEvent = `${virus.name} repositioned`
              }
              virusAi[virusId] = {
                ...virusAi[virusId],
                moveCooldown: mettaurMoveCadenceTicks
              }
            })
          }

          if (combatActive && queuedChipSlot !== null && !megamanBusy) {
            const queuedUse = tryUseChipFromSlot(
              { chipHand, chipDiscard, entities: nextEntities, barrierCharges },
              queuedChipSlot
            )
            if (queuedUse.used) {
              nextEntities = queuedUse.entities
              chipHand = queuedUse.chipHand
              chipDiscard = queuedUse.chipDiscard
              barrierCharges = queuedUse.barrierCharges
              chipIndicatorPanels = queuedUse.chipIndicatorPanels
              chipIndicatorTicksRemaining = chipIndicatorDurationTicks
              lastEvent = `Buffered chip resolved: ${queuedUse.lastEvent}`
              queuedChipSlot = null
              megamanRecoveryTicks = queuedUse.megamanRecoveryTicks
              pendingStepReturnPosition = queuedUse.pendingStepReturnPosition
              pendingStepReturnTicks = queuedUse.pendingStepReturnTicks
              autoChipCooldown = autoChipCadenceTicks
            } else {
              queuedChipSlot = null
            }
          }

          if (combatActive && megamanControlMode === 'fullAuto' && queuedChipSlot === null && autoChipCooldown === 0 && !megamanBusy) {
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
                chipIndicatorPanels = autoUse.chipIndicatorPanels
                chipIndicatorTicksRemaining = chipIndicatorDurationTicks
                megamanRecoveryTicks = autoUse.megamanRecoveryTicks
                pendingStepReturnPosition = autoUse.pendingStepReturnPosition
                pendingStepReturnTicks = autoUse.pendingStepReturnTicks
                lastEvent = `Auto chip: ${autoUse.lastEvent}`
              }
            }

            autoChipCooldown = autoChipCadenceTicks
          }

          if (combatActive && debugCompleteWaveRequested) {
            virusesRemaining = 1
            const projected = projectCombatEntities(nextEntities)
            if (projected.activeVirusId) {
              const killed = {
                ...projected.combatEntities,
                mettaur: {
                  ...projected.combatEntities.mettaur,
                  hp: 0,
                  alive: false,
                  hitFlashTicks: 0
                }
              }
              nextEntities = mergeCombatEntities(nextEntities, killed, projected.activeVirusId)
            }
            debugCompleteWaveRequested = false
            lastEvent = 'Debug: current wave completion forced'
          }

          if (combatActive && !nextEntities.megaman.alive) {
            waveStatus = 'failed'
            waveTransitionTick = null
            lastEvent = `Wave ${currentWave} failed. Reset battle to retry.`
          }

          if (combatActive && getAliveVirusIds(nextEntities).length === 0 && waveTransitionTick === null) {
            const deleteTicks = nextTicks - waveStartedAtTick
            const hpRatio = nextEntities.megaman.maxHp > 0 ? nextEntities.megaman.hp / nextEntities.megaman.maxHp : 0
            const bustingLv = computeBustingLv(deleteTicks, hpRatio)
            const reward = rollWaveReward(bustingLv)
            totalZenny += reward.zenny
            const nextStock = sortChipCollection([...chipStock, ...reward.chips])
            chipStock = nextStock
            waveResult = {
              wave: currentWave,
              level: currentLevel,
              deleteTimeLabel: formatDeleteTime(deleteTicks),
              bustingLv,
              reward
            }

            if (virusesRemaining > 1) {
              virusesRemaining -= 1
              virusAi = resetVirusAiForWave(virusAi, nextEntities)
              waveStartedAtTick = nextTicks
              lastEvent = `Virus deleted. ${virusesRemaining} remaining in wave ${currentWave}.`
            } else if (isBossWave(currentWave)) {
              waveStatus = 'levelCleared'
              lastEvent = `Boss wave cleared! Level ${currentLevel} complete.`
            } else {
              waveStatus = 'waveCleared'
              lastEvent = `Wave ${currentWave} cleared! Results ready.`
            }
            waveTransitionTick = null
          }

          if (combatActive && !megamanBusy && megamanControlMode !== 'manual' && megamanBusterCooldown === 0) {
            const projected = projectCombatEntities(nextEntities)
            if (projected.activeVirusId && canMegamanBusterHit(projected.combatEntities.megaman, projected.combatEntities.mettaur)) {
              const result = applyDamage(projected.combatEntities.megaman, projected.combatEntities.mettaur, megamanHitDamage)
              nextEntities = mergeCombatEntities(
                nextEntities,
                {
                  ...projected.combatEntities,
                  megaman: result.source,
                  mettaur: result.target
                },
                projected.activeVirusId
              )
              if (result.didHit) {
                lastEvent = `MegaBuster hit for ${megamanHitDamage}`
              }
            } else {
              lastEvent = 'MegaBuster missed (out of line)'
            }
            megamanBusterCooldown = megamanBusterCadenceTicks
            megamanRecoveryTicks = megamanBusterRecoveryTicks
          }

          if (combatActive && nextEntities.megaman.alive) {
            virusEntityIds.forEach((virusId) => {
              const virus = nextEntities[virusId]
              const ai = virusAi[virusId]
              if (!virus.alive) {
                virusAi[virusId] = {
                  ...ai,
                  telegraphTicksRemaining: 0,
                  recoveryTicks: 0
                }
                return
              }

              if (ai.telegraphTicksRemaining > 0) {
                const nextTelegraph = ai.telegraphTicksRemaining - 1
                virusAi[virusId] = {
                  ...ai,
                  telegraphTicksRemaining: nextTelegraph
                }

                if (nextTelegraph === 0) {
                  if (canMettaurSwingHit(virus, nextEntities.megaman)) {
                    if (barrierCharges > 0) {
                      barrierCharges -= 1
                      lastEvent = `${virus.name} swing blocked by barrier`
                    } else {
                      const result = applyDamage(virus, nextEntities.megaman, mettaurHitDamage)
                      nextEntities = {
                        ...nextEntities,
                        [virusId]: result.source,
                        megaman: result.target
                      }
                      if (result.didHit) {
                        megamanHitstunTicks = megamanHitstunTicksOnHit
                        lastEvent = `${virus.name} swing hit for ${mettaurHitDamage}`
                      }
                    }
                  } else {
                    lastEvent = `${virus.name} swing missed`
                  }
                  virusAi[virusId] = {
                    ...virusAi[virusId],
                    recoveryTicks: mettaurSwingRecoveryTicks
                  }
                }
                return
              }

              if (ai.attackCooldown === 0 && ai.recoveryTicks === 0) {
                virusAi[virusId] = {
                  ...ai,
                  telegraphTicksRemaining: mettaurTelegraphTicks,
                  attackCooldown: mettaurAttackCadenceTicks
                }
                lastEvent = `${virus.name} telegraph (${mettaurTelegraphTicks} ticks)`
              }
            })
          }

          const occupiedPanels = buildOccupiedPanels(nextEntities)
          const runtime = {
            virusAi,
            customGaugeTicks: gaugeTicks,
            customGaugeMaxTicks: current.customGaugeMaxTicks,
            chipHand,
            barrierCharges,
            megamanHitstunTicks,
            queuedChipSlot,
            megamanControlMode,
            programAdvanceAnimation,
            chipIndicatorPanels,
            currentLevel,
            currentWave,
            waveStatus,
            waveResult,
            battleStartBannerTicks,
            totalZenny,
            virusesRemaining,
            virusesTotal
          }

          const mettaurSummary = summarizeVirusAi(nextEntities, virusAi)

          return {
            ticks: nextTicks,
            entities: nextEntities,
            virusAi,
            occupiedPanels,
            combat: buildCombatSummary(nextEntities, runtime, lastEvent),
            megamanBusterCooldown,
            ...mettaurSummary,
            mettaurRespawnTick,
            currentLevel,
            currentWave,
            waveStatus,
            waveTransitionTick,
            waveStartedAtTick,
            waveResult,
            battleStartBannerTicks,
            totalZenny,
            virusesRemaining,
            virusesTotal,
            customGaugeTicks: gaugeTicks,
            chipStock,
            chipHand,
            chipDeck,
            chipDiscard,
            queuedChipSlot,
            barrierCharges,
            megamanHitstunTicks,
            megamanRecoveryTicks,
            pendingStepReturnPosition,
            pendingStepReturnTicks,
            autoChipCooldown,
            megamanAutoMoveCooldown,
            programAdvanceAnimation,
            forceProgramAdvanceOnNextCustomDraw,
            chipIndicatorPanels,
            chipIndicatorTicksRemaining,
            debugCompleteWaveRequested
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
