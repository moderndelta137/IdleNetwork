import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { loadChipCatalog, type ChipRuntimeId } from '../chipCatalog'
import { useGameStore } from '../../simulation/store/gameStore'

const chipCatalog = loadChipCatalog(100)
const folderMbLimit = 300

type ColumnKind = 'folder' | 'stock'

type SelectedChip =
  | {
      column: 'folder'
      index: number
    }
  | {
      column: 'stock'
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

type DropTargetHint = {
  column: ColumnKind
  mode: 'existing' | 'new'
  key?: string
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

const chipMb = (chipId: ChipRuntimeId) => Math.max(1, Math.ceil(chipCatalog[chipId].damage / 10))

export function FolderScene() {
  const chipFolder = useGameStore((state) => state.chipFolder)
  const chipStock = useGameStore((state) => state.chipStock)
  const moveFolderChipToStock = useGameStore((state) => state.moveFolderChipToStock)
  const moveStockChipToFolder = useGameStore((state) => state.moveStockChipToFolder)

  const [selectedChip, setSelectedChip] = useState<SelectedChip | null>(null)
  const [hoveredChip, setHoveredChip] = useState<SelectedChip | null>(null)
  const [draggingPayload, setDraggingPayload] = useState<DragChipPayload | null>(null)
  const [dropTargetHint, setDropTargetHint] = useState<DropTargetHint | null>(null)
  const [mbLimitFlash, setMbLimitFlash] = useState(false)

  const deckListRef = useRef<HTMLDivElement | null>(null)
  const stockListRef = useRef<HTMLDivElement | null>(null)
  const mbFlashTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (mbFlashTimeoutRef.current !== null) {
        window.clearTimeout(mbFlashTimeoutRef.current)
      }
    }
  }, [])

  const stockStacks = useMemo(() => buildStockStacks(chipStock), [chipStock])

  const selected = useMemo(() => {
    const activePreview = hoveredChip ?? selectedChip

    if (activePreview?.column === 'folder') {
      return chipFolder[activePreview.index] ?? chipFolder[0] ?? null
    }

    if (activePreview?.column === 'stock') {
      const stack = stockStacks.find((entry) => entry.chipId === activePreview.chipId && entry.code === activePreview.code)
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
  }, [chipFolder, chipStock, hoveredChip, selectedChip, stockStacks])

  const selectedChipDefinition = selected ? chipCatalog[selected.id] : null

  const folderCountLabel = useMemo(() => `${chipFolder.length}/30`, [chipFolder.length])
  const stockCountLabel = useMemo(() => `${chipStock.length}`, [chipStock.length])
  const folderMbTotal = useMemo(() => chipFolder.reduce((sum, chip) => sum + chipMb(chip.id), 0), [chipFolder])

  const flashMbLimit = () => {
    setMbLimitFlash(true)
    if (mbFlashTimeoutRef.current !== null) {
      window.clearTimeout(mbFlashTimeoutRef.current)
    }
    mbFlashTimeoutRef.current = window.setTimeout(() => {
      setMbLimitFlash(false)
    }, 520)
  }

  const setDropHintAndScroll = (nextHint: DropTargetHint | null) => {
    setDropTargetHint((current) => {
      if (
        current?.column === nextHint?.column &&
        current?.mode === nextHint?.mode &&
        current?.key === nextHint?.key
      ) {
        return current
      }

      if (nextHint) {
        const targetList = nextHint.column === 'folder' ? deckListRef.current : stockListRef.current
        if (targetList) {
          if (nextHint.mode === 'existing' && nextHint.key) {
            const row = targetList.querySelector<HTMLElement>(`[data-stack-key="${nextHint.key}"]`)
            row?.scrollIntoView({ block: 'nearest' })
          } else {
            targetList.scrollTo({ top: targetList.scrollHeight, behavior: 'smooth' })
          }
        }
      }

      return nextHint
    })
  }

  const resolveDropHint = (target: ColumnKind, payload: DragChipPayload): DropTargetHint | null => {
    if (target === 'folder' && payload.source === 'stock') {
      return { column: 'folder', mode: 'new' }
    }

    if (target === 'stock' && payload.source === 'folder') {
      const chip = chipFolder[payload.index]
      if (!chip) {
        return null
      }

      const stackKey = `${chip.id}::${chip.code}`
      const hasStack = stockStacks.some((stack) => `${stack.chipId}::${stack.code}` === stackKey)
      if (hasStack) {
        return { column: 'stock', mode: 'existing', key: stackKey }
      }

      return { column: 'stock', mode: 'new' }
    }

    return null
  }

  const canAddToFolder = (payload: Extract<DragChipPayload, { source: 'stock' }>) => {
    if (chipFolder.length >= 30) {
      return false
    }

    return folderMbTotal + chipMb(payload.chipId) <= folderMbLimit
  }

  const handleDropOnColumn = (target: ColumnKind, event: DragEvent) => {
    event.preventDefault()
    const payload = readDragPayload(event.dataTransfer.getData(dragPayloadMimeType))
    if (!payload || payload.source === target) {
      setDropHintAndScroll(null)
      return
    }

    if (target === 'folder' && payload.source === 'stock') {
      if (!canAddToFolder(payload)) {
        flashMbLimit()
        setDropHintAndScroll(null)
        setDraggingPayload(null)
        return
      }

      moveStockChipToFolder(payload.chipId, payload.code)
      setSelectedChip({ column: 'folder', index: 0 })
    }

    if (target === 'stock' && payload.source === 'folder') {
      const chip = chipFolder[payload.index]
      if (chip) {
        moveFolderChipToStock(payload.index)
        setSelectedChip({ column: 'stock', chipId: chip.id, code: chip.code })
      }
    }

    setHoveredChip(null)
    setDraggingPayload(null)
    setDropHintAndScroll(null)
  }

  const createDeckDragStart = (index: number) => (event: DragEvent) => {
    const chip = chipFolder[index]
    if (!chip) {
      return
    }

    const payload = { source: 'folder', index } satisfies DragChipPayload
    event.dataTransfer.setData(dragPayloadMimeType, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'move'
    setDraggingPayload(payload)
    setSelectedChip({ column: 'folder', index })
  }

  const createStockDragStart = (chipId: ChipRuntimeId, code: string) => (event: DragEvent) => {
    const payload = { source: 'stock', chipId, code } satisfies DragChipPayload
    event.dataTransfer.setData(dragPayloadMimeType, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'move'
    setDraggingPayload(payload)
    setSelectedChip({ column: 'stock', chipId, code })
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
            <header className="folder-chip-panel-header">
              <h3>DECK (MAX 30)</h3>
              <span className={`folder-mb-widget ${mbLimitFlash ? 'error-flash' : ''}`}>
                MB {folderMbTotal}/{folderMbLimit}
              </span>
            </header>
            <div
              ref={deckListRef}
              className={`folder-chip-list ${dropTargetHint?.column === 'folder' ? 'drop-target' : ''}`}
              role="listbox"
              aria-label="Chip deck list"
              onDragOver={(event) => {
                event.preventDefault()
                const payload = readDragPayload(event.dataTransfer.getData(dragPayloadMimeType))
                if (payload) {
                  setDropHintAndScroll(resolveDropHint('folder', payload))
                  if (payload.source === 'stock' && !canAddToFolder(payload)) {
                    flashMbLimit()
                  }
                }
              }}
              onDrop={(event) => handleDropOnColumn('folder', event)}
            >
              {chipFolder.map((chip, index) => {
                const chipDefinition = chipCatalog[chip.id]
                const isSelected = selectedChip?.column === 'folder' && selectedChip.index === index
                const isDragging = draggingPayload?.source === 'folder' && draggingPayload.index === index

                return (
                  <button
                    key={`folder-chip-${index}-${chip.id}-${chip.code}`}
                    type="button"
                    draggable
                    className={`folder-chip-row ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                    onDragStart={createDeckDragStart(index)}
                    onDragEnd={() => {
                      setDraggingPayload(null)
                      setDropHintAndScroll(null)
                    }}
                    onMouseEnter={() => setHoveredChip({ column: 'folder', index })}
                    onMouseLeave={() => setHoveredChip(null)}
                    onClick={() => setSelectedChip({ column: 'folder', index })}
                  >
                    <span className="folder-chip-row-index">{index + 1}</span>
                    <span className="folder-chip-row-name">{chip.name}</span>
                    <span className="folder-chip-row-code">{chip.code}</span>
                    <span className="folder-chip-row-mb">{Math.max(1, Math.ceil(chipDefinition.damage / 10))}MB</span>
                  </button>
                )
              })}
              {dropTargetHint?.column === 'folder' && dropTargetHint.mode === 'new' ? <div className="folder-temp-add-row">+</div> : null}
            </div>
          </div>

          <div className="folder-chip-panel">
            <h3>STOCK</h3>
            <div
              ref={stockListRef}
              className={`folder-chip-list ${dropTargetHint?.column === 'stock' ? 'drop-target' : ''}`}
              role="listbox"
              aria-label="Chip stock list"
              onDragOver={(event) => {
                event.preventDefault()
                const payload = readDragPayload(event.dataTransfer.getData(dragPayloadMimeType))
                if (payload) {
                  setDropHintAndScroll(resolveDropHint('stock', payload))
                }
              }}
              onDrop={(event) => handleDropOnColumn('stock', event)}
            >
              {stockStacks.map((stack, index) => {
                const chipDefinition = chipCatalog[stack.chipId]
                const stackKey = `${stack.chipId}::${stack.code}`
                const isSelected =
                  selectedChip?.column === 'stock' && selectedChip.chipId === stack.chipId && selectedChip.code === stack.code
                const isDragging =
                  draggingPayload?.source === 'stock' && draggingPayload.chipId === stack.chipId && draggingPayload.code === stack.code

                return (
                  <button
                    key={`stock-chip-${stack.chipId}-${stack.code}`}
                    type="button"
                    draggable
                    data-stack-key={stackKey}
                    className={`folder-chip-row stock ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                    onDragStart={createStockDragStart(stack.chipId, stack.code)}
                    onDragEnd={() => {
                      setDraggingPayload(null)
                      setDropHintAndScroll(null)
                    }}
                    onMouseEnter={() => setHoveredChip({ column: 'stock', chipId: stack.chipId, code: stack.code })}
                    onMouseLeave={() => setHoveredChip(null)}
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
              {dropTargetHint?.column === 'stock' && dropTargetHint.mode === 'new' ? <div className="folder-temp-add-row">+</div> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
