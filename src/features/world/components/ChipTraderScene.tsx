import { useMemo, useState } from 'react'
import { useGameStore } from '../../simulation/store/gameStore'

const singlePullCost = 220
const tenPullCount = 10
const tenPullCost = singlePullCost * tenPullCount

export function ChipTraderScene() {
  const totalZenny = useGameStore((state) => state.totalZenny)
  const rollGacha = useGameStore((state) => state.rollGacha)
  const rollGachaBatch = useGameStore((state) => state.rollGachaBatch)
  const [lastPulls, setLastPulls] = useState<string[]>([])

  const canSinglePull = totalZenny >= singlePullCost
  const canTenPull = totalZenny >= tenPullCost

  const pullSummary = useMemo(() => {
    if (lastPulls.length === 0) {
      return 'No recent pulls.'
    }

    return lastPulls.join(', ')
  }, [lastPulls])

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
            setLastPulls(pull ? [`${pull.name} ${pull.code}`] : [])
          }}
        >
          Pull x1
        </button>
        <button
          type="button"
          disabled={!canTenPull}
          onClick={() => {
            const pulls = rollGachaBatch(tenPullCount, singlePullCost)
            setLastPulls(pulls.map((chip) => `${chip.name} ${chip.code}`))
          }}
        >
          Pull x10
        </button>
      </div>

      <section className="trade-scene-results" aria-live="polite">
        <h3>Latest Pull Results</h3>
        <p>{pullSummary}</p>
      </section>
    </section>
  )
}
