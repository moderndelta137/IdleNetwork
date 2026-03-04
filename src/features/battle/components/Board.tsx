import { useMemo, useState } from 'react'
import { useGameStore } from '../../simulation/store/gameStore'

const ROWS = 3
const COLS = 6

const SPRITES_BY_ENTITY: Record<string, { idle: string; attack?: string }> = {
  megaman: {
    idle: '/sprites/megaman/MegaMan-idle.png'
  },
  mettaur: {
    idle: '/sprites/mettaur/Mettaur-idle.png',
    attack: '/sprites/mettaur/Mettaur-attack.png'
  }
}

type OccupantSpriteProps = {
  entityId: string
  fallbackLabel: string
  isAttacking: boolean
}

function OccupantSprite({ entityId, fallbackLabel, isAttacking }: OccupantSpriteProps) {
  const [isImageMissing, setIsImageMissing] = useState(false)

  const spriteSources = SPRITES_BY_ENTITY[entityId]
  const spriteSource = useMemo(() => {
    if (!spriteSources) {
      return null
    }

    if (isAttacking && spriteSources.attack) {
      return spriteSources.attack
    }

    return spriteSources.idle
  }, [isAttacking, spriteSources])

  if (!spriteSource || isImageMissing) {
    return <span className="occupant-fallback">{fallbackLabel}</span>
  }

  return (
    <img
      className="occupant-sprite"
      src={spriteSource}
      alt={fallbackLabel}
      loading="eager"
      decoding="sync"
      onError={() => setIsImageMissing(true)}
    />
  )
}

export function Board() {
  const entities = useGameStore((state) => state.entities)
  const occupiedPanels = useGameStore((state) => state.occupiedPanels)
  const activeHitboxPanels = useGameStore((state) => state.combat.activeHitboxPanels)
  const mettaurTelegraphTicksRemaining = useGameStore((state) => state.combat.mettaurTelegraphTicksRemaining)

  return (
    <section className="board" aria-label="Battlefield grid">
      {Array.from({ length: ROWS * COLS }).map((_, index) => {
        const row = Math.floor(index / COLS)
        const col = index % COLS
        const side = col < 3 ? 'player' : 'enemy'
        const key = `${row}-${col}`
        const occupantId = occupiedPanels[key]
        const hasActiveHitbox = activeHitboxPanels.includes(key)
        const occupant = occupantId ? entities[occupantId] : null

        return (
          <div key={key} className={`panel ${side} ${occupantId ? 'occupied' : ''} ${hasActiveHitbox ? 'hitbox-active' : ''}`}>
            {occupant ? (
              <div className="occupant" aria-label={occupant.name}>
                <OccupantSprite
                  entityId={occupant.id}
                  fallbackLabel={occupant.id === 'megaman' ? 'MegaMan' : 'Mettaur'}
                  isAttacking={occupant.id === 'mettaur' && mettaurTelegraphTicksRemaining > 0}
                />
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
