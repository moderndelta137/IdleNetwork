import { useMemo, useState } from 'react'
import { loadChipCatalog } from '../chipCatalog'
import { useGameStore } from '../../simulation/store/gameStore'

const chipCatalog = loadChipCatalog(100)

const clampIndex = (index: number, max: number) => Math.max(0, Math.min(index, Math.max(0, max - 1)))

export function FolderScene() {
  const chipFolder = useGameStore((state) => state.chipFolder)
  const chipStock = useGameStore((state) => state.chipStock)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const safeIndex = clampIndex(selectedIndex, chipFolder.length)
  const selectedChip = chipFolder[safeIndex] ?? null
  const selectedChipDefinition = selectedChip ? chipCatalog[selectedChip.id] : null

  const folderCountLabel = useMemo(() => `${chipFolder.length}/30`, [chipFolder.length])
  const stockCountLabel = useMemo(() => `${chipStock.length}`, [chipStock.length])

  return (
    <section className="folder-scene" aria-label="Chip Folder Editor">
      <header className="folder-scene-header">
        <h2>FOLDER EDIT</h2>
        <div className="folder-counters">
          <span className="folder-count">Deck {folderCountLabel}</span>
          <span className="stock-count">Stock {stockCountLabel}</span>
        </div>
      </header>

      <div className="folder-scene-body">
        <aside className="folder-chip-preview" aria-label="Selected chip details">
          <div className="folder-chip-art">{selectedChip?.name ?? 'Empty'}</div>
          <div className="folder-chip-stats">
            <span className="folder-chip-code">Code: {selectedChip?.code ?? '-'}</span>
            <span className="folder-chip-dmg">DMG: {selectedChipDefinition?.damage ?? 0}</span>
          </div>
          <p className="folder-chip-description">{selectedChipDefinition?.description ?? 'No chip selected.'}</p>
          <div className="folder-chip-scrollbar" />
        </aside>

        <div className="folder-chip-columns">
          <div className="folder-chip-panel">
            <h3>DECK (MAX 30)</h3>
            <div className="folder-chip-list" role="listbox" aria-label="Chip deck list">
              {chipFolder.map((chip, index) => {
                const chipDefinition = chipCatalog[chip.id]
                const isSelected = index === safeIndex

                return (
                  <button
                    key={`folder-chip-${index}-${chip.id}-${chip.code}`}
                    type="button"
                    className={`folder-chip-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <span className="folder-chip-row-index">{index + 1}</span>
                    <span className="folder-chip-row-name">{chip.name}</span>
                    <span className="folder-chip-row-code">{chip.code}</span>
                    <span className="folder-chip-row-mb">{Math.max(1, Math.ceil(chipDefinition.damage / 10))}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="folder-chip-panel">
            <h3>STOCK</h3>
            <div className="folder-chip-list" role="listbox" aria-label="Chip stock list">
              {chipStock.map((chip, index) => {
                const chipDefinition = chipCatalog[chip.id]
                return (
                  <div key={`stock-chip-${index}-${chip.id}-${chip.code}`} className="folder-chip-row stock">
                    <span className="folder-chip-row-index">{index + 1}</span>
                    <span className="folder-chip-row-name">{chip.name}</span>
                    <span className="folder-chip-row-code">{chip.code}</span>
                    <span className="folder-chip-row-mb">{Math.max(1, Math.ceil(chipDefinition.damage / 10))}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
