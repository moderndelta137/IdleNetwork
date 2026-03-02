import { useEffect } from 'react'
import { Board } from '../features/battle/components/Board'
import { useGameStore } from '../features/simulation/store/gameStore'

const SPEEDS = [1, 2, 4] as const

export function App() {
  const speed = useGameStore((state) => state.speed)
  const ticks = useGameStore((state) => state.ticks)
  const entities = useGameStore((state) => state.entities)
  const combat = useGameStore((state) => state.combat)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const selectChip = useGameStore((state) => state.selectChip)
  const useSelectedChip = useGameStore((state) => state.useSelectedChip)
  const resetBattle = useGameStore((state) => state.resetBattle)

  useEffect(() => {
    const unsub = useGameStore.getState().start()
    return unsub
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (combat.handOpen) {
        if (event.key >= '1' && event.key <= '5') {
          event.preventDefault()
          selectChip(Number(event.key) - 1)
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          useSelectedChip()
          return
        }
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
  }, [combat.handOpen, movePlayer, selectChip, useSelectedChip])

  const target = entities[combat.targetId]

  return (
    <main className="app-shell">
      <header>
        <h1>Idle Network — M2 Chips Vertical Slice (Task 1-2)</h1>
        <p>Custom Gauge + hand flow and manual chip use are now active.</p>
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

      <section className="chip-hud" aria-label="Custom Gauge and Chip Hand">
        <div className="gauge-card">
          <strong>Custom Gauge</strong>
          <div className="gauge-track" role="progressbar" aria-valuemin={0} aria-valuemax={combat.customGaugeMaxTicks} aria-valuenow={combat.customGaugeTicks}>
            <div
              className="gauge-fill"
              style={{ width: `${(combat.customGaugeTicks / combat.customGaugeMaxTicks) * 100}%` }}
            />
          </div>
          <span>
            {combat.customGaugeTicks}/{combat.customGaugeMaxTicks}
          </span>
          <span>Barrier: {combat.barrierCharges > 0 ? 'Active' : 'None'}</span>
        </div>

        <div className="hand-card">
          <strong>Chip Hand</strong>
          {combat.handOpen ? (
            <>
              <div className="chip-list" role="group" aria-label="Chip hand buttons">
                {combat.chipHand.map((chip, index) => (
                  <button
                    key={`${chip.name}-${chip.code}-${index}`}
                    className={combat.selectedChipIndex === index ? 'active' : ''}
                    onClick={() => selectChip(index)}
                    type="button"
                  >
                    {index + 1}. {chip.name} [{chip.code}]
                  </button>
                ))}
              </div>
              <button type="button" onClick={useSelectedChip} disabled={combat.selectedChipIndex === null}>
                Use Selected Chip (Enter)
              </button>
            </>
          ) : (
            <span>Gauge charging... chip hand opens automatically at full gauge.</span>
          )}
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

      <p className="control-tip">Move MegaMan: Arrow Keys/WASD. Chips: 1-5 to select, Enter to use when hand is open.</p>

      <Board />
    </main>
  )
}
