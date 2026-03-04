import chipsCsvRaw from './data/chips.csv?raw'
import { csvRowsToRecords, parseCsv, secondsToTicks } from '../shared/csv'

export type ChipRuntimeId = 'cannon' | 'sword' | 'recover10' | 'barrier'

type ChipCsvRow = {
  Name: string
  DMG: string
  Type: string
  Description: string
  Lag: string
  Recoil: string
  Effects: string
}

export type ChipDefinition = {
  id: ChipRuntimeId
  name: string
  damage: number
  type: string
  description: string
  lagSeconds: number
  recoilSeconds: number
  lagTicks: number
  recoilTicks: number
  effects: string
}

const normalizeChipId = (name: string): ChipRuntimeId => {
  const normalized = name.toLowerCase().replace(/\s+/g, '')
  if (normalized === 'cannon' || normalized === 'sword' || normalized === 'recover10' || normalized === 'barrier') {
    return normalized
  }

  throw new Error(`Unsupported chip name in CSV: ${name}`)
}

export const loadChipCatalog = (baseTickMs: number): Record<ChipRuntimeId, ChipDefinition> => {
  const rows = parseCsv(chipsCsvRaw)
  const records = csvRowsToRecords<ChipCsvRow>(rows)

  return records.reduce<Record<ChipRuntimeId, ChipDefinition>>((acc, record) => {
    const id = normalizeChipId(record.Name)
    const lagSeconds = Number.parseFloat(record.Lag)
    const recoilSeconds = Number.parseFloat(record.Recoil)

    acc[id] = {
      id,
      name: record.Name,
      damage: Number.parseInt(record.DMG, 10) || 0,
      type: record.Type,
      description: record.Description,
      lagSeconds,
      recoilSeconds,
      lagTicks: secondsToTicks(lagSeconds, baseTickMs),
      recoilTicks: secondsToTicks(recoilSeconds, baseTickMs),
      effects: record.Effects
    }

    return acc
  }, {} as Record<ChipRuntimeId, ChipDefinition>)
}
