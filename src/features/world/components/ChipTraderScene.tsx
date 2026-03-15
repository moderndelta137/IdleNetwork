import { useState } from 'react'
import { loadChipCatalog } from '../../chips/chipCatalog'
import { useGameStore } from '../../simulation/store/gameStore'

const chipCatalog = loadChipCatalog(100)
const singlePullCost = 220
const tenPullCount = 10
const tenPullCost = singlePullCost * tenPullCount

export function ChipTraderScene() {
  const totalZenny = useGameStore((state) => state.totalZenny)
  const rollGacha = useGameStore((state) => state.rollGacha)
  const rollGachaBatch = useGameStore((state) => state.rollGachaBatch)
  const [lastPulls, setLastPulls] = useState<Array<{ name: string; code: string; mb: number }>>([])

  const canSinglePull = totalZenny >= singlePullCost
  const canTenPull = totalZenny >= tenPullCost

  return (
    <section className="trade-scene" aria-label="Chip Trader scene">
      <header className="trade-scene-header">
        <h2>Chip Trader</h2>
        <p>Spend Zenny for random chips. Pulled chips are sent to Stock in the Folder scene.</p>
      </header>

      <div className="trade-scene-stats" role="list" aria-label="Chip Trader stats">
        <span role="listitem">Zenny: {totalZenny}</span>
        <span role="listitem">Single Pull: {singlePullCost} Z</span>
        <span role="listitem">10 Pulls: {tenPullCost} Z</span>
      </div>

      <div className="trade-scene-actions">
        <button
          type="button"
          disabled={!canSinglePull}
          onClick={() => {
            const pull = rollGacha(singlePullCost)
            setLastPulls(pull ? [{ name: pull.name, code: pull.code, mb: chipCatalog[pull.id].mb }] : [])
          }}
        >
          Pull x1
        </button>
        <button
          type="button"
          disabled={!canTenPull}
          onClick={() => {
            const pulls = rollGachaBatch(tenPullCount, singlePullCost)
            setLastPulls(pulls.map((chip) => ({ name: chip.name, code: chip.code, mb: chipCatalog[chip.id].mb })))
          }}
        >
          Pull x10
        </button>
      </div>

      <section className="trade-scene-results" aria-live="polite">
        <h3>Latest Pull Results</h3>
        {lastPulls.length === 0 ? (
          <p>No recent pulls.</p>
        ) : (
          <table className="chip-table" aria-label="Latest chip pulls">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Code</th>
                <th>MB</th>
              </tr>
            </thead>
            <tbody>
              {lastPulls.map((chip, index) => (
                <tr key={`${chip.name}-${chip.code}-${index}`} className="folder-chip-row stock">
                  <td className="folder-chip-row-index">{index + 1}</td>
                  <td className="folder-chip-row-name">{chip.name}</td>
                  <td className="folder-chip-row-code">{chip.code}</td>
                  <td className="folder-chip-row-size">{chip.mb}MB</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  )
}
