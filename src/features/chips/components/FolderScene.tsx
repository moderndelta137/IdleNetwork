import { useMemo, useState, type DragEvent } from 'react'
import { loadChipCatalog, type ChipRuntimeId } from '../chipCatalog'
import { useGameStore } from '../../simulation/store/gameStore'

const chipCatalog = loadChipCatalog(100)

type ColumnKind = 'folder' | 'stock'

type SelectedChip = {
  column: ColumnKind
  chipId: ChipRuntimeId
  code: string
}

type DragChipPayload =
  | {
      source: 'folder'
      index: number
    }
  | {
      source: 'stock'
      chipId: ChipRuntimeId
      code: string
    }

const dragPayloadMimeType = 'application/x-idle-network-chip'

const readDragPayload = (raw: string): DragChipPayload | null => {
  try {
    const parsed = JSON.parse(raw) as DragChipPayload
    if (parsed.source === 'folder' && Number.isInteger(parsed.index)) {
      return parsed
    }

    if (parsed.source === 'stock' && typeof parsed.chipId === 'string' && typeof parsed.code === 'string') {
      return parsed
    }

    return null
  } catch {
    return null
  }
}

type StockStack = {
  chipId: ChipRuntimeId
  name: string
  code: string
  count: number
}

const buildStockStacks = (chips: ReturnType<typeof useGameStore.getState>['chipStock']): StockStack[] => {
  const stacks = new Map<string, StockStack>()

  chips.forEach((chip) => {
    const key = `${chip.id}::${chip.code}`
    const existing = stacks.get(key)
    if (existing) {
      existing.count += 1
      return
    }

    stacks.set(key, {
      chipId: chip.id,
      name: chip.name,
      code: chip.code,
      count: 1
    })
  })

  return Array.from(stacks.values()).sort((a, b) => {
    if (a.name !== b.name) {
      return a.name.localeCompare(b.name)
    }

    if (a.code !== b.code) {
      return a.code.localeCompare(b.code)
    }

    return a.chipId.localeCompare(b.chipId)
  })
}

export function FolderScene() {
  const chipFolder = useGameStore((state) => state.chipFolder)
  const chipStock = useGameStore((state) => state.chipStock)
  const moveFolderChipToStock = useGameStore((state) => state.moveFolderChipToStock)
  const moveStockChipToFolder = useGameStore((state) => state.moveStockChipToFolder)
  const [selectedChip, setSelectedChip] = useState<SelectedChip | null>(null)

  const stockStacks = useMemo(() => buildStockStacks(chipStock), [chipStock])

  const selected = useMemo(() => {
    if (selectedChip?.column === 'folder') {
      return chipFolder.find((chip) => chip.id === selectedChip.chipId && chip.code === selectedChip.code) ?? chipFolder[0] ?? null
    }

    if (selectedChip?.column === 'stock') {
      const stack = stockStacks.find((entry) => entry.chipId === selectedChip.chipId && entry.code === selectedChip.code)
      if (!stack) {
        return chipFolder[0] ?? chipStock[0] ?? null
      }

      return {
        id: stack.chipId,
        name: stack.name,
        code: stack.code
      }
    }

    return chipFolder[0] ?? chipStock[0] ?? null
  }, [chipFolder, chipStock, selectedChip, stockStacks])

  const selectedChipDefinition = selected ? chipCatalog[selected.id] : null

  const folderCountLabel = useMemo(() => `${chipFolder.length}/30`, [chipFolder.length])
  const stockCountLabel = useMemo(() => `${chipStock.length}`, [chipStock.length])

  const handleDropOnColumn = (target: ColumnKind, event: DragEvent) => {
    event.preventDefault()
    const payload = readDragPayload(event.dataTransfer.getData(dragPayloadMimeType))
    if (!payload || payload.source === target) {
      return
    }

    if (target === 'folder' && payload.source === 'stock') {
      moveStockChipToFolder(payload.chipId, payload.code)
      return
    }

    if (target === 'stock' && payload.source === 'folder') {
      moveFolderChipToStock(payload.index)
    }
  }

  const createDeckDragStart = (index: number) => (event: DragEvent) => {
    event.dataTransfer.setData(dragPayloadMimeType, JSON.stringify({ source: 'folder', index } satisfies DragChipPayload))
    event.dataTransfer.effectAllowed = 'move'
  }

  const createStockDragStart = (chipId: ChipRuntimeId, code: string) => (event: DragEvent) => {
    event.dataTransfer.setData(dragPayloadMimeType, JSON.stringify({ source: 'stock', chipId, code } satisfies DragChipPayload))
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
                const isSelected = selectedChip?.column === 'folder' && chip.id === selectedChip.chipId && chip.code === selectedChip.code

                return (
                  <button
                    key={`folder-chip-${index}-${chip.id}-${chip.code}`}
                    type="button"
                    draggable
                    className={`folder-chip-row ${isSelected ? 'selected' : ''}`}
                    onDragStart={createDeckDragStart(index)}
                    onClick={() => setSelectedChip({ column: 'folder', chipId: chip.id, code: chip.code })}
                  >
                    <span className="folder-chip-row-index">{index + 1}</span>
                    <span className="folder-chip-row-name">{chip.name}</span>
                    <span className="folder-chip-row-code">{chip.code}</span>
                    <span className="folder-chip-row-mb">{Math.max(1, Math.ceil(chipDefinition.damage / 10))}MB</span>
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
              {stockStacks.map((stack, index) => {
                const chipDefinition = chipCatalog[stack.chipId]
                const isSelected =
                  selectedChip?.column === 'stock' && selectedChip.chipId === stack.chipId && selectedChip.code === stack.code

                return (
                  <button
                    key={`stock-chip-${stack.chipId}-${stack.code}`}
                    type="button"
                    draggable
                    className={`folder-chip-row stock ${isSelected ? 'selected' : ''}`}
                    onDragStart={createStockDragStart(stack.chipId, stack.code)}
                    onClick={() => setSelectedChip({ column: 'stock', chipId: stack.chipId, code: stack.code })}
                  >
                    <span className="folder-chip-row-index">{index + 1}</span>
                    <span className="folder-chip-row-name">{stack.name}</span>
                    <span className="folder-chip-row-code">{stack.code}</span>
                    <span className="folder-chip-row-mb">x{stack.count}</span>
                    <span className="folder-chip-row-size">{Math.max(1, Math.ceil(chipDefinition.damage / 10))}MB</span>
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
