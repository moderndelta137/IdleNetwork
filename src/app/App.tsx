import { useEffect } from 'react'
import { Board } from '../features/battle/components/Board'
import { useGameStore } from '../features/simulation/store/gameStore'

const SPEEDS = [1, 2, 4] as const

export function App() {
  const speed = useGameStore((state) => state.speed)
  const ticks = useGameStore((state) => state.ticks)
  const entities = useGameStore((state) => state.entities)
  const setSpeed = useGameStore((state) => state.setSpeed)

  useEffect(() => {
    const unsub = useGameStore.getState().start()
    return unsub
  }, [])

  return (
    <main className="app-shell">
      <header>
        <h1>Idle Network — M1 Combat Vertical Slice</h1>
        <p>Task 1: Entity + board occupancy model for MegaMan and Mettaur.</p>
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

      <section className="entity-hud" aria-label="Combat entities">
        {Object.values(entities).map((entity) => (
          <div key={entity.id} className="entity-card">
            <strong>{entity.name}</strong>
            <span>
              Panel ({entity.position.row + 1},{entity.position.col + 1})
            </span>
            <span>Status: {entity.alive ? 'Alive' : 'KO'}</span>
          </div>
        ))}
      </section>

      <Board />
    </main>
  )
}
