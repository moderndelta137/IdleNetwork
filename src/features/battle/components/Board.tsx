import { useMemo, useState } from 'react'
import { useGameStore } from '../../simulation/store/gameStore'

const ROWS = 3
const COLS = 6

type SpriteSources = {
  idle: string[]
  attack?: string[]
}

const SPRITES_BY_ENTITY: Record<string, SpriteSources> = {
  megaman: {
    idle: [
      'sprites/megaman/MegaMan-idle.png',
      'sprites/megaman/megaman-idle.png'
    ]
  },
  mettaur: {
    idle: [
      'sprites/mettaur/Mettaur-idle.png',
      'sprites/mettaur/mettaur-idle.png'
    ],
    attack: [
      'sprites/mettaur/Mettaur-attack.png',
      'sprites/mettaur/mettaur-attack.png',
      'sprites/mettaur/Mettaur-swing.png',
      'sprites/mettaur/mettaur-swing.png'
    ]
  },
  fireman: {
    idle: ['sprites/fireman/FireMan-idle.png'],
    attack: ['sprites/fireman/FireMan-attack1.png']
  }
}

type OccupantSpriteProps = {
  entityId: string
  fallbackLabel: string
  isAttacking: boolean
  isFlashing: boolean
}

function OccupantSprite({ entityId, fallbackLabel, isAttacking, isFlashing }: OccupantSpriteProps) {
  const [attemptIndex, setAttemptIndex] = useState(0)

  const normalizedEntityId = entityId.startsWith('mettaur') ? 'mettaur' : entityId
  const spriteSources = SPRITES_BY_ENTITY[normalizedEntityId]
  const candidates = useMemo(() => {
    if (!spriteSources) {
      return []
    }

    if (isAttacking && spriteSources.attack) {
      return spriteSources.attack
    }

    return spriteSources.idle
  }, [isAttacking, spriteSources])

  const spriteSource = candidates[attemptIndex]

  if (!spriteSource) {
    return <span className={`occupant-fallback ${isFlashing ? 'hit-flash' : ''}`}>{fallbackLabel}</span>
  }

  return (
    <img
      className={`occupant-sprite ${isFlashing ? 'hit-flash' : ''}`}
      src={spriteSource}
      alt={fallbackLabel}
      loading="eager"
      decoding="sync"
      onError={() => setAttemptIndex((current) => current + 1)}
    />
  )
}

export function Board() {
  const entities = useGameStore((state) => state.entities)
  const occupiedPanels = useGameStore((state) => state.occupiedPanels)
  const activeHitboxPanels = useGameStore((state) => state.combat.activeHitboxPanels)
  const chipIndicatorPanels = useGameStore((state) => state.combat.chipIndicatorPanels)
  const mettaurTelegraphTicksRemaining = useGameStore((state) => state.combat.mettaurTelegraphTicksRemaining)
  const targetId = useGameStore((state) => state.combat.targetId)

  return (
    <section className="board" aria-label="Battlefield grid">
      {Array.from({ length: ROWS * COLS }).map((_, index) => {
        const row = Math.floor(index / COLS)
        const col = index % COLS
        const side = col < 3 ? 'player' : 'enemy'
        const key = `${row}-${col}`
        const occupantId = occupiedPanels[key]
        const hasActiveHitbox = activeHitboxPanels.includes(key)
        const hasChipIndicator = chipIndicatorPanels.includes(key)
        const occupant = occupantId ? entities[occupantId] : null

        return (
          <div key={key} className={`panel ${side} ${occupantId ? 'occupied' : ''} ${hasActiveHitbox ? 'hitbox-active' : ''} ${hasChipIndicator ? 'chip-indicator' : ''}`}>
            {occupant ? (
              <div className="occupant" aria-label={occupant.name}>
                <OccupantSprite
                  entityId={occupant.id}
                  fallbackLabel={occupant.id === 'megaman' ? 'MegaMan' : occupant.name}
                  isAttacking={occupant.id === targetId && mettaurTelegraphTicksRemaining > 0}
                  isFlashing={occupant.hitFlashTicks > 0}
                />
                {occupant.id !== 'megaman' ? <span className="occupant-hp">{occupant.hp}</span> : null}
              </div>
            ) : (
              <span>
                {row + 1},{col + 1}
              </span>
            )}
          </div>
        )
      })}
    </section>
  )
}
