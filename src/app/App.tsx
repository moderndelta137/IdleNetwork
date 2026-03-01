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

  useEffect(() => {
    const unsub = useGameStore.getState().start()
    return unsub
  }, [])

  const target = entities[combat.targetId]

  return (
    <main className="app-shell">
      <header>
        <h1>Idle Network — M1 Combat Vertical Slice</h1>
        <p>Task 2: HP + damage loop with player and enemy HUD tracking.</p>
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
        </div>
        <div className="hp-card">
          <strong>{target.name}</strong>
          <span>
            HP: {combat.targetHp}/{combat.targetMaxHp}
          </span>
          <span>Status: {target.alive ? 'Alive' : 'KO'}</span>
        </div>
      </section>

      <Board />
    </main>
  )
}
