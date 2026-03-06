import chipsCsvRaw from './data/chips.csv?raw'
import { csvRowsToRecords, parseCsv, secondsToTicks } from '../shared/csv'

export type ChipRuntimeId =
  | 'cannon'
  | 'hicannon'
  | 'm-cannon'
  | 'sword'
  | 'widesword'
  | 'longsword'
  | 'spreader'
  | 'minibomb'
  | 'lilbomb'
  | 'stepsword'
  | 'recover10'
  | 'recover30'
  | 'barrier'
  | 'zcannon'

type ChipCsvRow = {
  Name: string
  DMG: string
  MB: string
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
  mb: number
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

  const aliasToId: Record<string, ChipRuntimeId> = {
    cannon: 'cannon',
    hicannon: 'hicannon',
    'm-cannon': 'm-cannon',
    mcannon: 'm-cannon',
    sword: 'sword',
    widesword: 'widesword',
    longsword: 'longsword',
    spreader: 'spreader',
    minibomb: 'minibomb',
    lilbomb: 'lilbomb',
    stepsword: 'stepsword',
    recover10: 'recover10',
    recover30: 'recover30',
    barrier: 'barrier',
    'z-cannon': 'zcannon',
    zcannon: 'zcannon'
  }

  const id = aliasToId[normalized]
  if (id) {
    return id
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
    const parsedMb = Number.parseInt(record.MB, 10)
    const fallbackMb = Math.max(1, Math.ceil((Number.parseInt(record.DMG, 10) || 0) / 10))

    acc[id] = {
      id,
      name: record.Name,
      damage: Number.parseInt(record.DMG, 10) || 0,
      mb: Number.isFinite(parsedMb) ? parsedMb : fallbackMb,
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
