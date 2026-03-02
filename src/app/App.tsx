import { useEffect } from 'react'
import { Board } from '../features/battle/components/Board'
import { useGameStore } from '../features/simulation/store/gameStore'

const SPEEDS = [1, 2, 4] as const

export function App() {
  const ticks = useGameStore((state) => state.ticks)
  const speed = useGameStore((state) => state.speed)
  const combat = useGameStore((state) => state.combat)
  const entities = useGameStore((state) => state.entities)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const cycleMegamanControlMode = useGameStore((state) => state.cycleMegamanControlMode)
  const useChipSlot = useGameStore((state) => state.useChipSlot)
  const useLeftmostChip = useGameStore((state) => state.useLeftmostChip)
  const manualFireBuster = useGameStore((state) => state.manualFireBuster)
  const resetBattle = useGameStore((state) => state.resetBattle)
  const start = useGameStore((state) => state.start)

  useEffect(() => {
    const stop = start()
    return () => stop()
  }, [start])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key
      const upperKey = key.toUpperCase()

      if (key >= '1' && key <= '5') {
        event.preventDefault()
        useChipSlot(Number.parseInt(key, 10) - 1)
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        if (combat.megamanControlMode === 'manual') {
          manualFireBuster()
        } else {
          useLeftmostChip()
        }
        return
      }

      if (upperKey === 'F') {
        event.preventDefault()
        manualFireBuster()
        return
      }

      switch (upperKey) {
        case 'ARROWUP':
        case 'W':
          event.preventDefault()
          movePlayer(-1, 0)
          break
        case 'ARROWDOWN':
        case 'S':
          event.preventDefault()
          movePlayer(1, 0)
          break
        case 'ARROWLEFT':
        case 'A':
          event.preventDefault()
          movePlayer(0, -1)
          break
        case 'ARROWRIGHT':
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
  }, [combat.megamanControlMode, manualFireBuster, movePlayer, useChipSlot, useLeftmostChip])

  const target = entities[combat.targetId]

  return (
    <main className="app-shell">
      <header>
        <h1>Idle Network — M2 Chips Vertical Slice</h1>
        <p>Always-on chip hand flow with gauge refill, deck/discard reshuffle, and buffered use.</p>
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
        <button type="button" onClick={cycleMegamanControlMode}>
          Control: {combat.megamanControlMode}
        </button>
      </section>

      <section className="gauge-card" aria-label="Custom gauge">
        <strong>Custom Gauge</strong>
        <div className="gauge-track" role="progressbar" aria-valuemin={0} aria-valuemax={combat.customGaugeMaxTicks} aria-valuenow={combat.customGaugeTicks}>
          <div className="gauge-fill" style={{ width: `${(combat.customGaugeTicks / combat.customGaugeMaxTicks) * 100}%` }} />
        </div>
        <span>
          {combat.customGaugeTicks}/{combat.customGaugeMaxTicks}
        </span>
        <span>Barrier: {combat.barrierCharges > 0 ? 'Active' : 'None'}</span>
        <span>Hitstun: {combat.megamanHitstunTicks}t</span>
        <span>Buffered chip: {combat.queuedChipSlot !== null ? `Slot ${combat.queuedChipSlot + 1}` : 'None'}</span>
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

      <p className="control-tip">Manual mode: Move (WASD/Arrows), Buster (Space or F), Chips (1-5). Semi-auto: auto move+buster, manual chips. Full-auto: auto move+buster+chips (manual chip override still works).</p>

      <Board />

      <section className="chip-hand-bar" aria-label="Chip hand area">
        {combat.chipHand.map((chip, index) => (
          <button
            key={`chip-slot-${index}`}
            type="button"
            className={`chip-slot ${chip ? 'filled' : 'empty'} ${combat.queuedChipSlot === index ? 'queued' : ''}`}
            onClick={() => useChipSlot(index)}
          >
            <span className="chip-slot-index">{index + 1}</span>
            {chip ? (
              <>
                <span className="chip-name">{chip.name}</span>
                <span className="chip-code">Code {chip.code}</span>
              </>
            ) : (
              <span className="chip-empty-label">Empty</span>
            )}
          </button>
        ))}
      </section>
    </main>
  )
}
