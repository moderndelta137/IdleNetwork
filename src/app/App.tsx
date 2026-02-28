import { useEffect } from 'react'
import { Board } from '../features/battle/components/Board'
import { useGameStore } from '../features/simulation/store/gameStore'

const SPEEDS = [1, 2, 4] as const

export function App() {
  const speed = useGameStore((state) => state.speed)
  const ticks = useGameStore((state) => state.ticks)
  const setSpeed = useGameStore((state) => state.setSpeed)

  useEffect(() => {
    const unsub = useGameStore.getState().start()
    return unsub
  }, [])

  return (
    <main className="app-shell">
      <header>
        <h1>Idle Network — M0 Foundation</h1>
        <p>3x6 board renderer + route-independent simulation runtime.</p>
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

      <Board />
    </main>
  )
}
