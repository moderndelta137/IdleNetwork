import { create } from 'zustand'

type Speed = 1 | 2 | 4

type EntityId = 'megaman' | 'mettaur'

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
}

type GameState = {
  ticks: number
  speed: Speed
  running: boolean
  entities: Record<EntityId, EntityState>
  occupiedPanels: OccupiedPanels
  combat: CombatSummary
  setSpeed: (speed: Speed) => void
  start: () => () => void
}

let rafId: number | null = null
let previous = 0
let accumulator = 0

const baseTickMs = 100
const megamanDamageCadenceTicks = 10
const mettaurDamageCadenceTicks = 14
const megamanHitDamage = 8
const mettaurHitDamage = 6

const initialEntities: Record<EntityId, EntityState> = {
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
}

const makePanelKey = (position: PanelPosition) => `${position.row}-${position.col}`

const buildOccupiedPanels = (entities: Record<EntityId, EntityState>): OccupiedPanels => {
  const occupancy: OccupiedPanels = {}

  Object.values(entities).forEach((entity) => {
    if (!entity.alive) {
      return
    }

    occupancy[makePanelKey(entity.position)] = entity.id
  })

  return occupancy
}

const buildCombatSummary = (entities: Record<EntityId, EntityState>): CombatSummary => {
  const player = entities.megaman
  const target = entities.mettaur

  return {
    playerHp: player.hp,
    playerMaxHp: player.maxHp,
    targetId: target.id,
    targetHp: target.hp,
    targetMaxHp: target.maxHp
  }
}

const applyDamage = (
  source: EntityState,
  target: EntityState,
  damage: number
): { source: EntityState; target: EntityState } => {
  if (!source.alive || !target.alive) {
    return { source, target }
  }

  const nextHp = Math.max(0, target.hp - damage)

  return {
    source,
    target: {
      ...target,
      hp: nextHp,
      alive: nextHp > 0
    }
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  ticks: 0,
  speed: 1,
  running: false,
  entities: initialEntities,
  occupiedPanels: buildOccupiedPanels(initialEntities),
  combat: buildCombatSummary(initialEntities),
  setSpeed: (speed) => set({ speed }),
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

          if (nextTicks % megamanDamageCadenceTicks === 0) {
            const result = applyDamage(nextEntities.megaman, nextEntities.mettaur, megamanHitDamage)
            nextEntities = {
              ...nextEntities,
              megaman: result.source,
              mettaur: result.target
            }
          }

          if (nextTicks % mettaurDamageCadenceTicks === 0) {
            const result = applyDamage(nextEntities.mettaur, nextEntities.megaman, mettaurHitDamage)
            nextEntities = {
              ...nextEntities,
              mettaur: result.source,
              megaman: result.target
            }
          }

          return {
            ticks: nextTicks,
            entities: nextEntities,
            occupiedPanels: buildOccupiedPanels(nextEntities),
            combat: buildCombatSummary(nextEntities)
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
