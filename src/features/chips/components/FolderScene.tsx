import { useMemo, useState, type DragEvent } from 'react'
import { loadChipCatalog } from '../chipCatalog'
import { useGameStore } from '../../simulation/store/gameStore'

const chipCatalog = loadChipCatalog(100)

type ColumnKind = 'folder' | 'stock'

type SelectedChip = {
  column: ColumnKind
  index: number
}

type DragChipPayload = {
  source: ColumnKind
  index: number
}

const clampIndex = (index: number, max: number) => Math.max(0, Math.min(index, Math.max(0, max - 1)))

const dragPayloadMimeType = 'application/x-idle-network-chip'

const readDragPayload = (raw: string): DragChipPayload | null => {
  try {
    const parsed = JSON.parse(raw) as DragChipPayload
    if ((parsed.source === 'folder' || parsed.source === 'stock') && Number.isInteger(parsed.index)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function FolderScene() {
  const chipFolder = useGameStore((state) => state.chipFolder)
  const chipStock = useGameStore((state) => state.chipStock)
  const moveFolderChipToStock = useGameStore((state) => state.moveFolderChipToStock)
  const moveStockChipToFolder = useGameStore((state) => state.moveStockChipToFolder)
  const [selectedChip, setSelectedChip] = useState<SelectedChip>({ column: 'folder', index: 0 })

  const selectedColumnChips = selectedChip.column === 'folder' ? chipFolder : chipStock
  const safeSelectedIndex = clampIndex(selectedChip.index, selectedColumnChips.length)
  const selected = selectedColumnChips[safeSelectedIndex] ?? null
  const selectedChipDefinition = selected ? chipCatalog[selected.id] : null

  const folderCountLabel = useMemo(() => `${chipFolder.length}/30`, [chipFolder.length])
  const stockCountLabel = useMemo(() => `${chipStock.length}`, [chipStock.length])

  const handleDropOnColumn = (target: ColumnKind, event: DragEvent) => {
    event.preventDefault()
    const payload = readDragPayload(event.dataTransfer.getData(dragPayloadMimeType))
    if (!payload || payload.source === target) {
      return
    }

    if (target === 'folder') {
      moveStockChipToFolder(payload.index)
      setSelectedChip({ column: 'folder', index: 0 })
      return
    }

    moveFolderChipToStock(payload.index)
    setSelectedChip({ column: 'stock', index: 0 })
  }

  const createDragStart = (source: ColumnKind, index: number) => (event: DragEvent) => {
    event.dataTransfer.setData(dragPayloadMimeType, JSON.stringify({ source, index } satisfies DragChipPayload))
    event.dataTransfer.effectAllowed = 'move'
  }

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
          <div className="folder-chip-art">{selected?.name ?? 'Empty'}</div>
          <div className="folder-chip-stats">
            <span className="folder-chip-code">Code: {selected?.code ?? '-'}</span>
            <span className="folder-chip-dmg">DMG: {selectedChipDefinition?.damage ?? 0}</span>
          </div>
          <p className="folder-chip-description">{selectedChipDefinition?.description ?? 'No chip selected.'}</p>
          <div className="folder-chip-scrollbar" />
        </aside>

        <div className="folder-chip-columns">
          <div className="folder-chip-panel">
            <h3>DECK (MAX 30)</h3>
            <div
              className="folder-chip-list"
              role="listbox"
              aria-label="Chip deck list"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDropOnColumn('folder', event)}
            >
              {chipFolder.map((chip, index) => {
                const chipDefinition = chipCatalog[chip.id]
                const isSelected = selectedChip.column === 'folder' && index === safeSelectedIndex

                return (
                  <button
                    key={`folder-chip-${index}-${chip.id}-${chip.code}`}
                    type="button"
                    draggable
                    className={`folder-chip-row ${isSelected ? 'selected' : ''}`}
                    onDragStart={createDragStart('folder', index)}
                    onClick={() => setSelectedChip({ column: 'folder', index })}
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
            <div
              className="folder-chip-list"
              role="listbox"
              aria-label="Chip stock list"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDropOnColumn('stock', event)}
            >
              {chipStock.map((chip, index) => {
                const chipDefinition = chipCatalog[chip.id]
                const isSelected = selectedChip.column === 'stock' && index === safeSelectedIndex

                return (
                  <button
                    key={`stock-chip-${index}-${chip.id}-${chip.code}`}
                    type="button"
                    draggable
                    className={`folder-chip-row stock ${isSelected ? 'selected' : ''}`}
                    onDragStart={createDragStart('stock', index)}
                    onClick={() => setSelectedChip({ column: 'stock', index })}
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
        </div>
      </div>
    </section>
  )
}
