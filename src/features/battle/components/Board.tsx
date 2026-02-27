const ROWS = 3
const COLS = 6

export function Board() {
  return (
    <section className="board" aria-label="Battlefield grid">
      {Array.from({ length: ROWS * COLS }).map((_, index) => {
        const row = Math.floor(index / COLS)
        const col = index % COLS
        const side = col < 3 ? 'player' : 'enemy'

        return (
          <div key={`${row}-${col}`} className={`panel ${side}`}>
            <span>
              {row + 1},{col + 1}
            </span>
          </div>
        )
      })}
    </section>
  )
}
