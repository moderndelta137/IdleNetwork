import { useMemo, useState } from 'react'
import { loadChipCatalog, type ChipRuntimeId } from '../../chips/chipCatalog'
import { useGameStore } from '../../simulation/store/gameStore'

const chipCatalog = loadChipCatalog(100)
const singlePullCost = 220
const tenPullCount = 10
const tenPullCost = singlePullCost * tenPullCount

type PulledChip = {
  id: ChipRuntimeId
  name: string
  code: string
  mb: number
}

export function ChipTraderScene() {
  const totalZenny = useGameStore((state) => state.totalZenny)
  const rollGacha = useGameStore((state) => state.rollGacha)
  const rollGachaBatch = useGameStore((state) => state.rollGachaBatch)
  const [lastPulls, setLastPulls] = useState<PulledChip[]>([])
  const [hoveredPullIndex, setHoveredPullIndex] = useState<number | null>(null)

  const canSinglePull = totalZenny >= singlePullCost
  const canTenPull = totalZenny >= tenPullCost

  const previewChip = useMemo(() => {
    if (lastPulls.length === 0) {
      return null
    }

    if (hoveredPullIndex !== null) {
      return lastPulls[hoveredPullIndex] ?? lastPulls[0]
    }

    return lastPulls[0]
  }, [hoveredPullIndex, lastPulls])

  const previewDefinition = previewChip ? chipCatalog[previewChip.id] : null

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
            setLastPulls(pull ? [{ id: pull.id, name: pull.name, code: pull.code, mb: chipCatalog[pull.id].mb }] : [])
            setHoveredPullIndex(null)
          }}
        >
          Pull x1
        </button>
        <button
          type="button"
          disabled={!canTenPull}
          onClick={() => {
            const pulls = rollGachaBatch(tenPullCount, singlePullCost)
            setLastPulls(pulls.map((chip) => ({ id: chip.id, name: chip.name, code: chip.code, mb: chipCatalog[chip.id].mb })))
            setHoveredPullIndex(null)
          }}
        >
          Pull x10
        </button>
      </div>

      <div className="economy-scene-body">
        <aside className="folder-chip-preview" aria-label="Hovered chip details">
          <div className="folder-chip-art">{previewChip?.name ?? 'No Pulls'}</div>
          <div className="folder-chip-stats">
            <span className="folder-chip-code">Code: {previewChip?.code ?? '-'}</span>
            <span className="folder-chip-dmg">DMG: {previewDefinition?.damage ?? 0}</span>
          </div>
          <p className="folder-chip-description">{previewDefinition?.description ?? 'Pull chips and hover rows to inspect details.'}</p>
          <div className="folder-chip-scrollbar" />
        </aside>

        <section className="trade-scene-results" aria-live="polite">
          <h3>Latest Pull Results</h3>
          {lastPulls.length === 0 ? (
            <p>No recent pulls.</p>
          ) : (
            <table className="chip-table chip-table-trader" aria-label="Latest chip pulls">
              <colgroup>
                <col className="chip-col-index" />
                <col className="chip-col-name" />
                <col className="chip-col-code" />
                <col className="chip-col-mb" />
              </colgroup>
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
                  <tr
                    key={`${chip.name}-${chip.code}-${index}`}
                    className="folder-chip-row stock"
                    onMouseEnter={() => setHoveredPullIndex(index)}
                    onMouseLeave={() => setHoveredPullIndex(null)}
                  >
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
      </div>
    </section>
  )
}
