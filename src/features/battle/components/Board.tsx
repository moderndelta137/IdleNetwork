import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../../simulation/store/gameStore'

const ROWS = 3
const COLS = 6

type SpriteSources = {
  idle: string[]
  attack?: string[]
  buster?: string[]
  shoot?: string[]
  sword?: string[]
  damage?: string[]
}

type MegamanSpriteAction = 'idle' | 'buster' | 'shoot' | 'sword' | 'damage'

const SPRITES_BY_ENTITY: Record<string, SpriteSources> = {
  megaman: {
    idle: [
      'sprites/megaman/MegaMan-idle.png',
      'sprites/megaman/megaman-idle.png'
    ],
    buster: [
      'sprites/megaman/Megaman-Buster_attack1.png',
      'sprites/megaman/megaman-buster_attack1.png'
    ],
    shoot: [
      'sprites/megaman/Megaman-Shoot_attack1.png',
      'sprites/megaman/megaman-shoot_attack1.png'
    ],
    sword: [
      'sprites/megaman/Megaman-Sword_attack1.png',
      'sprites/megaman/megaman-sword_attack1.png'
    ],
    damage: [
      'sprites/megaman/Megaman-Damage.png',
      'sprites/megaman/megaman-damage.png'
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
  actorName: string
  fallbackLabel: string
  isAttacking: boolean
  isFlashing: boolean
  megamanAction: MegamanSpriteAction
}

function OccupantSprite({ entityId, actorName, fallbackLabel, isAttacking, isFlashing, megamanAction }: OccupantSpriteProps) {
  const [attemptIndex, setAttemptIndex] = useState(0)

  const normalizedActor = actorName.trim().toLowerCase()
  const normalizedEntityId = normalizedActor === 'fireman' ? 'fireman' : entityId.startsWith('mettaur') ? 'mettaur' : entityId
  const spriteSources = SPRITES_BY_ENTITY[normalizedEntityId]
  const candidates = useMemo(() => {
    if (!spriteSources) {
      return []
    }

    if (normalizedEntityId === 'megaman') {
      if (megamanAction === 'damage' && spriteSources.damage) {
        return spriteSources.damage
      }
      if (megamanAction === 'buster' && spriteSources.buster) {
        return spriteSources.buster
      }
      if (megamanAction === 'shoot' && spriteSources.shoot) {
        return spriteSources.shoot
      }
      if (megamanAction === 'sword' && spriteSources.sword) {
        return spriteSources.sword
      }
      return spriteSources.idle
    }

    if (isAttacking && spriteSources.attack) {
      return spriteSources.attack
    }

    return spriteSources.idle
  }, [isAttacking, megamanAction, normalizedEntityId, spriteSources])

  useEffect(() => {
    setAttemptIndex(0)
  }, [candidates])

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

const resolveMegamanActionFromEvent = (lastEvent: string): MegamanSpriteAction | null => {
  if (lastEvent.includes('MegaBuster')) {
    return 'buster'
  }

  const normalized = lastEvent
    .replace('Buffered chip resolved: ', '')
    .replace('Auto chip: ', '')

  const swordChipPattern = /(Sword|WideSword|LongSword|StepSword)/
  if (swordChipPattern.test(normalized)) {
    return 'sword'
  }

  const shootChipPattern = /(Cannon|HiCannon|M-Cannon|Spreader|MiniBomb|LilBomb|Z-Cannon)/
  if (shootChipPattern.test(normalized)) {
    return 'shoot'
  }

  return null
}

const getMegamanActionDurationTicks = (action: MegamanSpriteAction): number => {
  if (action === 'buster') {
    return 5
  }

  if (action === 'shoot') {
    return 5
  }

  if (action === 'sword') {
    return 5
  }

  if (action === 'damage') {
    return 6
  }

  return 0
}

export function Board() {
  const ticks = useGameStore((state) => state.ticks)
  const entities = useGameStore((state) => state.entities)
  const occupiedPanels = useGameStore((state) => state.occupiedPanels)
  const activeHitboxPanels = useGameStore((state) => state.combat.activeHitboxPanels)
  const chipIndicatorPanels = useGameStore((state) => state.combat.chipIndicatorPanels)
  const mettaurTelegraphTicksRemaining = useGameStore((state) => state.combat.mettaurTelegraphTicksRemaining)
  const targetId = useGameStore((state) => state.combat.targetId)
  const lastEvent = useGameStore((state) => state.combat.lastEvent)
  const megamanHitstunTicks = useGameStore((state) => state.combat.megamanHitstunTicks)
  const [megamanAnimation, setMegamanAnimation] = useState<{ action: MegamanSpriteAction; untilTick: number }>({ action: 'idle', untilTick: 0 })

  const megaman = entities.megaman

  useEffect(() => {
    const queueAnimation = (action: MegamanSpriteAction, durationTicks: number) => {
      const nextUntilTick = ticks + durationTicks
      setMegamanAnimation((current) => {
        if (current.action === action && current.untilTick >= nextUntilTick) {
          return current
        }

        return {
          action,
          untilTick: Math.max(current.untilTick, nextUntilTick)
        }
      })
    }

    if (megamanHitstunTicks > 0 || megaman.hitFlashTicks > 0) {
      queueAnimation('damage', Math.max(getMegamanActionDurationTicks('damage'), megamanHitstunTicks))
      return
    }

    const actionFromEvent = resolveMegamanActionFromEvent(lastEvent)
    if (actionFromEvent) {
      queueAnimation(actionFromEvent, getMegamanActionDurationTicks(actionFromEvent))
    }
  }, [lastEvent, megaman.hitFlashTicks, megamanHitstunTicks, ticks])

  const megamanAction = megamanAnimation.untilTick > ticks ? megamanAnimation.action : 'idle'

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
                  actorName={occupant.name}
                  fallbackLabel={occupant.id === 'megaman' ? 'MegaMan' : occupant.name}
                  isAttacking={occupant.id === targetId && mettaurTelegraphTicksRemaining > 0}
                  isFlashing={occupant.hitFlashTicks > 0}
                  megamanAction={occupant.id === 'megaman' ? megamanAction : 'idle'}
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
