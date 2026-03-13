import { useMemo } from 'react'
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

export function AreaMapScene() {
  const currentLevel = useGameStore((state) => state.currentLevel)
  const currentWave = useGameStore((state) => state.currentWave)
  const totalZenny = useGameStore((state) => state.totalZenny)
  const selectAreaLevel = useGameStore((state) => state.selectAreaLevel)

  const areas = useMemo<AreaNode[]>(() => {
    const unlockedLevel = Math.max(1, currentLevel)

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
        unlocked: true,
        status: unlockedLevel >= 2 ? (unlockedLevel === 2 ? 'current' : 'available') : 'locked',
        x: 40,
        y: 48
      },
      {
        id: 'sci-lab-net',
        name: 'SciLab Net',
        subtitle: 'Dense waves and heavier chip drops',
        recommendedLevel: 3,
        unlocked: true,
        status: unlockedLevel >= 3 ? (unlockedLevel === 3 ? 'current' : 'available') : 'locked',
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
  }, [currentLevel])

  const paths: AreaPath[] = [
    { id: 'path-a', from: 'acdc-town', to: 'yoka-net' },
    { id: 'path-b', from: 'yoka-net', to: 'sci-lab-net' },
    { id: 'path-c', from: 'sci-lab-net', to: 'undernet-gate' }
  ]

  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas])

  return (
    <section className="area-map-scene" aria-label="Area map scene">
      <header className="area-map-header">
        <h2>Area Map</h2>
        <p>Choose where to jack in next. Unlock gates are shown now; areas 2-3 are now switchable with placeholder wave tuning.</p>
      </header>

      <div className="area-map-stats" role="list" aria-label="Area progression stats">
        <span role="listitem">Current Level: {currentLevel}</span>
        <span role="listitem">Current Wave: {currentWave}/10</span>
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
          <article
            key={area.id}
            className={`area-node ${area.status}`}
            style={{ left: `${area.x}%`, top: `${area.y}%` }}
          >
            <div className="area-node-title-row">
              <h3>{area.name}</h3>
              <span className={`area-node-status ${area.status}`}>{area.status.toUpperCase()}</span>
            </div>
            <p>{area.subtitle}</p>
            <div className="area-node-meta">Recommended Lv. {area.recommendedLevel}</div>
            <button
              type="button"
              disabled={!area.unlocked}
              onClick={() => selectAreaLevel(area.recommendedLevel)}
            >
              {area.unlocked ? (area.status === 'current' ? 'Current Area' : 'Switch Area') : 'Locked'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
