import { useGameStore } from '../../simulation/store/gameStore'

const ROWS = 3
const COLS = 6

export function Board() {
  const entities = useGameStore((state) => state.entities)
  const occupiedPanels = useGameStore((state) => state.occupiedPanels)

  return (
    <section className="board" aria-label="Battlefield grid">
      {Array.from({ length: ROWS * COLS }).map((_, index) => {
        const row = Math.floor(index / COLS)
        const col = index % COLS
        const side = col < 3 ? 'player' : 'enemy'
        const key = `${row}-${col}`
        const occupantId = occupiedPanels[key]
        const occupant = occupantId ? entities[occupantId] : null

        return (
          <div key={key} className={`panel ${side} ${occupantId ? 'occupied' : ''}`}>
            {occupant ? (
              <span className="occupant" aria-label={occupant.name}>
                {occupant.id === 'megaman' ? 'MegaMan' : 'Mettaur'}
              </span>
            ) : (
              <span>
                {row + 1},{col + 1}
              </span>
            )}
          </div>
        )
      })}
    </section>
  )
}
