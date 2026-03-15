import { useMemo, useState } from 'react'
import { loadChipCatalog, type ChipRuntimeId } from '../../chips/chipCatalog'
import { useGameStore } from '../../simulation/store/gameStore'

const chipCatalog = loadChipCatalog(100)
const rotationWindowTicks = 6 * 60 * 60 * 10
const offerCount = 6

type ShopOffer = {
  chipId: ChipRuntimeId
  cost: number
}

const getShopPool = (): ChipRuntimeId[] => Object.keys(chipCatalog).filter((chipId) => chipId !== 'zcannon') as ChipRuntimeId[]

const buildOffersForRotation = (rotationIndex: number): ShopOffer[] => {
  const pool = getShopPool()
  if (pool.length === 0) {
    return []
  }

  const offers: ShopOffer[] = []
  for (let index = 0; index < offerCount; index += 1) {
    const poolIndex = (rotationIndex * 7 + index * 3) % pool.length
    const chipId = pool[poolIndex]
    const mb = chipCatalog[chipId].mb
    const cost = 80 + mb * 9 + index * 15
    offers.push({ chipId, cost })
  }

  return offers
}

export function HigsbyShopScene() {
  const ticks = useGameStore((state) => state.ticks)
  const totalZenny = useGameStore((state) => state.totalZenny)
  const buyShopChip = useGameStore((state) => state.buyShopChip)
  const [statusMessage, setStatusMessage] = useState('No recent purchase.')
  const [hoveredOfferIndex, setHoveredOfferIndex] = useState<number | null>(null)

  const rotationIndex = Math.floor(ticks / rotationWindowTicks)
  const ticksIntoRotation = ticks % rotationWindowTicks
  const ticksLeftInRotation = rotationWindowTicks - ticksIntoRotation
  const hoursLeft = Math.floor(ticksLeftInRotation / (60 * 60 * 10))
  const minutesLeft = Math.floor((ticksLeftInRotation % (60 * 60 * 10)) / (60 * 10))

  const offers = useMemo(() => buildOffersForRotation(rotationIndex), [rotationIndex])

  const previewOffer = hoveredOfferIndex !== null ? offers[hoveredOfferIndex] ?? offers[0] : offers[0]
  const previewDefinition = previewOffer ? chipCatalog[previewOffer.chipId] : null

  return (
    <section className="higsby-scene" aria-label="Higsby's Shop scene">
      <header className="higsby-scene-header">
        <h2>Higsby&apos;s Shop</h2>
        <p>Buy listed chips with Zenny. Inventory rotates every 6 hours of simulation time.</p>
      </header>

      <div className="higsby-scene-stats" role="list" aria-label="Higsby shop stats">
        <span role="listitem">Zenny: {totalZenny}</span>
        <span role="listitem">Rotation: #{rotationIndex + 1}</span>
        <span role="listitem">Next refresh: {hoursLeft}h {minutesLeft}m</span>
      </div>

      <div className="economy-scene-body">
        <aside className="folder-chip-preview" aria-label="Hovered chip details">
          <div className="folder-chip-art">{previewDefinition?.name ?? 'No Offers'}</div>
          <div className="folder-chip-stats">
            <span className="folder-chip-code">Code: *</span>
            <span className="folder-chip-dmg">DMG: {previewDefinition?.damage ?? 0}</span>
          </div>
          <p className="folder-chip-description">{previewDefinition?.description ?? 'No chip offers in this rotation.'}</p>
          <div className="folder-chip-scrollbar" />
        </aside>

        <section>
          <table className="chip-table chip-table-shop" aria-label="Current chip offers">
            <colgroup>
              <col className="chip-col-index" />
              <col className="chip-col-name" />
              <col className="chip-col-code" />
              <col className="chip-col-mb" />
              <col className="chip-col-price" />
              <col className="chip-col-action" />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Code</th>
                <th>MB</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer, index) => (
                <tr
                  key={`${offer.chipId}-${index}`}
                  className="folder-chip-row stock"
                  onMouseEnter={() => setHoveredOfferIndex(index)}
                  onMouseLeave={() => setHoveredOfferIndex(null)}
                >
                  <td className="folder-chip-row-index">{index + 1}</td>
                  <td className="folder-chip-row-name">{chipCatalog[offer.chipId].name}</td>
                  <td className="folder-chip-row-code">*</td>
                  <td className="folder-chip-row-size">{chipCatalog[offer.chipId].mb}MB</td>
                  <td className="folder-chip-row-mb">{offer.cost} Z</td>
                  <td>
                    <button
                      type="button"
                      disabled={totalZenny < offer.cost}
                      onClick={() => {
                        const purchased = buyShopChip(offer.chipId, offer.cost)
                        setStatusMessage(purchased ? `Purchased ${purchased.name} ${purchased.code}.` : 'Not enough Zenny.')
                      }}
                    >
                      Buy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="higsby-status" aria-live="polite">{statusMessage}</div>
        </section>
      </div>
    </section>
  )
}
