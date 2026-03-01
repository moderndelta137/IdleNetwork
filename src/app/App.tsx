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
  const resetBattle = useGameStore((state) => state.resetBattle)

  useEffect(() => {
    const unsub = useGameStore.getState().start()
    return unsub
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [movePlayer])

  const target = entities[combat.targetId]

  return (
    <main className="app-shell">
      <header>
        <h1>Idle Network — M1 Combat Vertical Slice</h1>
        <p>Tasks 3-5: Auto behavior, manual movement override, and KO/reset flow.</p>
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

      <p className="control-tip">Move MegaMan with Arrow Keys or WASD (player-side 3x3 only).</p>

      <Board />
    </main>
  )
}
