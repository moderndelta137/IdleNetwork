import { useMemo, useState } from 'react'
import { useGameStore } from '../../simulation/store/gameStore'

type AreaNode = {
  id: string
  name: string
  subtitle: string
  recommendedLevel: number
  unlocked: boolean
  status: 'available' | 'locked' | 'current'
  x: number
  y: number
}

type AreaPath = {
  id: string
  from: string
  to: string
}

type AreaMapSceneProps = {
  onAreaSwitched?: () => void
  highlightedAreaLevel?: number | null
}

export function AreaMapScene({ onAreaSwitched, highlightedAreaLevel = null }: AreaMapSceneProps) {
  const currentLevel = useGameStore((state) => state.currentLevel)
  const currentWave = useGameStore((state) => state.currentWave)
  const totalZenny = useGameStore((state) => state.totalZenny)
  const unlockedAreaMaxLevel = useGameStore((state) => state.unlockedAreaMaxLevel)
  const areaProgressByLevel = useGameStore((state) => state.areaProgressByLevel)
  const selectAreaLevel = useGameStore((state) => state.selectAreaLevel)
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)

  const areas = useMemo<AreaNode[]>(() => {
    const unlockedLevel = Math.max(1, unlockedAreaMaxLevel)

    return [
      {
        id: 'acdc-town',
        name: 'ACDC Town Net',
        subtitle: 'Starter zone · Mettaur traffic',
        recommendedLevel: 1,
        unlocked: true,
        status: unlockedLevel === 1 ? 'current' : 'available',
        x: 14,
        y: 74
      },
      {
        id: 'yoka-net',
        name: 'Yoka Net',
        subtitle: 'Heat lanes and mid-tier virus routes',
        recommendedLevel: 2,
        unlocked: unlockedLevel >= 2,
        status: currentLevel === 2 ? 'current' : unlockedLevel >= 2 ? 'available' : 'locked',
        x: 40,
        y: 48
      },
      {
        id: 'sci-lab-net',
        name: 'SciLab Net',
        subtitle: 'Dense waves and heavier chip drops',
        recommendedLevel: 3,
        unlocked: unlockedLevel >= 3,
        status: currentLevel === 3 ? 'current' : unlockedLevel >= 3 ? 'available' : 'locked',
        x: 64,
        y: 66
      },
      {
        id: 'undernet-gate',
        name: 'UnderNet Gate',
        subtitle: 'High-risk route for future M3+ content',
        recommendedLevel: 4,
        unlocked: false,
        status: 'locked',
        x: 84,
        y: 32
      }
    ]
  }, [currentLevel, unlockedAreaMaxLevel])

  const paths: AreaPath[] = [
    { id: 'path-a', from: 'acdc-town', to: 'yoka-net' },
    { id: 'path-b', from: 'yoka-net', to: 'sci-lab-net' },
    { id: 'path-c', from: 'sci-lab-net', to: 'undernet-gate' }
  ]

  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas])

  const highlightedAreaId = areas.find((area) => area.recommendedLevel === highlightedAreaLevel)?.id ?? null
  const detailArea = areaById.get(hoveredAreaId ?? selectedAreaId ?? highlightedAreaId ?? '') ?? null

  const handleSwitchArea = (area: AreaNode) => {
    if (!area.unlocked || area.status === 'current') {
      return
    }

    selectAreaLevel(area.recommendedLevel)
    onAreaSwitched?.()
  }

  return (
    <section className="area-map-scene" aria-label="Area map scene">
      <header className="area-map-header">
        <h2>Area Map</h2>
        <p>Hover or click a node to inspect area details. Switching an area jumps directly into battle.</p>
      </header>

      <div className="area-map-stats" role="list" aria-label="Area progression stats">
        <span role="listitem">Current Level: {currentLevel}</span>
        <span role="listitem">Current Wave: {currentWave}/10</span>
        <span role="listitem">Unlocked Area: {unlockedAreaMaxLevel}</span>
        <span role="listitem">Zenny: {totalZenny}</span>
      </div>

      <div className="area-map-canvas" role="img" aria-label="Network area map with connected routes">
        <svg className="area-map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {paths.map((path) => {
            const from = areaById.get(path.from)
            const to = areaById.get(path.to)
            if (!from || !to) {
              return null
            }

            const routeClass = from.unlocked && to.unlocked ? 'unlocked' : 'locked'
            return <line key={path.id} className={routeClass} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
          })}
        </svg>

        {areas.map((area) => (
          <div
            key={area.id}
            className={`area-node-shell ${area.status}`}
            style={{ left: `${area.x}%`, top: `${area.y}%` }}
            onMouseEnter={() => setHoveredAreaId(area.id)}
            onMouseLeave={() => setHoveredAreaId((current) => (current === area.id ? null : current))}
          >
            <button
              type="button"
              className={`area-node-circle ${area.status}`}
              aria-label={area.name}
              onClick={() => setSelectedAreaId(area.id)}
            >
              {area.unlocked ? '◉' : '🔒'}
            </button>
            <span className="area-node-name-label">{area.name}</span>
          </div>
        ))}

        {detailArea ? (
          <aside
            className="area-detail-window"
            style={{ left: `${detailArea.x}%`, top: `${detailArea.y}%` }}
            role="dialog"
            aria-label={`${detailArea.name} details`}
          >
            <div className="area-detail-header">
              <strong>{detailArea.name}</strong>
              <span className={`area-node-status ${detailArea.status}`}>{detailArea.status.toUpperCase()}</span>
            </div>
            <p>{detailArea.subtitle}</p>
            <div className="area-node-meta">Recommended Lv. {detailArea.recommendedLevel}</div>
            <div className="area-node-meta">Progress: {Math.min(10, areaProgressByLevel[detailArea.recommendedLevel] ?? 0)}/10</div>
            <button
              type="button"
              disabled={!detailArea.unlocked || detailArea.status === 'current'}
              onClick={() => handleSwitchArea(detailArea)}
            >
              {detailArea.unlocked
                ? detailArea.status === 'current'
                  ? 'Current Area'
                  : 'Switch Area'
                : 'Locked'}
            </button>
          </aside>
        ) : null}
      </div>
    </section>
  )
}
