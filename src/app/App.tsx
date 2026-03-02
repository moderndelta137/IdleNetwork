import { useEffect } from 'react'
import { Board } from '../features/battle/components/Board'
import { chipInfo, useGameStore } from '../features/simulation/store/gameStore'

const SPEEDS = [1, 2, 4] as const

export function App() {
  const speed = useGameStore((state) => state.speed)
  const ticks = useGameStore((state) => state.ticks)
  const entities = useGameStore((state) => state.entities)
  const combat = useGameStore((state) => state.combat)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const useChipSlot = useGameStore((state) => state.useChipSlot)
  const useLeftMostChip = useGameStore((state) => state.useLeftMostChip)
  const resetBattle = useGameStore((state) => state.resetBattle)

  useEffect(() => {
    const unsub = useGameStore.getState().start()
    return unsub
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key >= '1' && event.key <= '5') {
        event.preventDefault()
        useChipSlot(Number(event.key) - 1)
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        useLeftMostChip()
        return
      }

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault()
          movePlayer(-1, 0)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault()
          movePlayer(1, 0)
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault()
          movePlayer(0, -1)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault()
          movePlayer(0, 1)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [movePlayer, useChipSlot, useLeftMostChip])

  const target = entities[combat.targetId]

  return (
    <main className="app-shell">
      <header>
        <h1>Idle Network — M2 Active Hand Slice</h1>
        <p>Hand is always active. Use chips instantly or queue one during hit-stun.</p>
      </header>

      <section className="hud">
        <span>Ticks: {ticks}</span>
        <div className="speed-controls" role="group" aria-label="Simulation speed">
          {SPEEDS.map((value) => (
            <button
              key={value}
              className={value === speed ? 'active' : ''}
              onClick={() => setSpeed(value)}
              type="button"
            >
              {value}x
            </button>
          ))}
        </div>
      </section>

      <section className="chip-hud" aria-label="Custom Gauge and Chip Status">
        <div className="gauge-card">
          <strong>Custom Gauge</strong>
          <div className="gauge-track" role="progressbar" aria-valuemin={0} aria-valuemax={combat.customGaugeMaxTicks} aria-valuenow={combat.customGaugeTicks}>
            <div className="gauge-fill" style={{ width: `${(combat.customGaugeTicks / combat.customGaugeMaxTicks) * 100}%` }} />
          </div>
          <span>
            {combat.customGaugeTicks}/{combat.customGaugeMaxTicks}
          </span>
          <span>Deck: {combat.deckCount} | Discard: {combat.discardCount}</span>
        </div>

        <div className="gauge-card">
          <strong>State</strong>
          <span>Barrier: {combat.barrierCharges > 0 ? `${combat.barrierCharges} hit` : 'None'}</span>
          <span>Hit-Stun: {combat.megamanHitStunTicks}t</span>
          <span>Queued Chip Slot: {combat.queuedChipSlot !== null ? combat.queuedChipSlot + 1 : 'None'}</span>
        </div>
      </section>

      <section className="hp-hud" aria-label="HP tracker">
        <div className="hp-card">
          <strong>MegaMan.EXE</strong>
          <span>
            HP: {combat.playerHp}/{combat.playerMaxHp}
          </span>
          <span>Status: {entities.megaman.alive ? 'Alive' : 'KO'}</span>
          <span>
            Panel ({entities.megaman.position.row + 1},{entities.megaman.position.col + 1})
          </span>
          <button type="button" onClick={resetBattle} disabled={entities.megaman.alive}>
            Reset Battle State
          </button>
        </div>
        <div className="hp-card">
          <strong>{target.name}</strong>
          <span>
            HP: {combat.targetHp}/{combat.targetMaxHp}
          </span>
          <span>Status: {target.alive ? 'Alive' : 'KO'}</span>
          <span>
            Telegraph: {combat.mettaurTelegraphTicksRemaining > 0 ? `${combat.mettaurTelegraphTicksRemaining}t` : 'Idle'}
          </span>
        </div>
      </section>

      <section className="combat-log" aria-live="polite">
        Last event: {combat.lastEvent}
      </section>

      <p className="control-tip">Move: Arrow Keys/WASD. Use Slot: 1-5 or click. Space: use left-most non-empty chip.</p>

      <Board />

      <section className="hand-bar" aria-label="Active chip hand">
        {combat.chipHand.map((chip, index) => {
          if (!chip) {
            return (
              <button key={`empty-${index}`} type="button" className="chip-slot empty" disabled>
                <span className="chip-slot-title">{index + 1}. Empty</span>
                <span className="chip-slot-detail">Waiting for gauge refill</span>
              </button>
            )
          }

          const info = chipInfo[chip.id]

          return (
            <button key={`${chip.name}-${chip.code}-${index}`} type="button" className="chip-slot" onClick={() => useChipSlot(index)}>
              <span className="chip-slot-title">
                {index + 1}. {chip.name} [{chip.code}]
              </span>
              <span className="chip-slot-detail">{info.description}</span>
            </button>
          )
        })}
      </section>
    </main>
  )
}
