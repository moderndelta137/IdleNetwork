import { validateEffectsGrammar } from '../shared/effectGrammar'
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

type CatalogWarningLogger = (message: string) => void

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

const parseNonNegativeInteger = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const parseNonNegativeFloat = (value: string): number | null => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export const loadChipCatalogFromCsv = (
  csvRaw: string,
  baseTickMs: number,
  logWarning: CatalogWarningLogger = (message) => console.warn(message)
): Record<ChipRuntimeId, ChipDefinition> => {
  const rows = parseCsv(csvRaw)
  const records = csvRowsToRecords<ChipCsvRow>(rows)

  return records.reduce<Record<ChipRuntimeId, ChipDefinition>>((acc, record, index) => {
    const rowNumber = index + 2

    if (!record.Name || !record.Type || !record.Effects) {
      logWarning(`[chipCatalog] Skipping row ${rowNumber}: missing required fields (Name/Type/Effects)`)
      return acc
    }

    const effectsValidationError = validateEffectsGrammar(record.Effects)
    if (effectsValidationError) {
      logWarning(`[chipCatalog] Skipping row ${rowNumber} (${record.Name}): ${effectsValidationError}`)
      return acc
    }

    const damage = parseNonNegativeInteger(record.DMG)
    if (damage === null) {
      logWarning(`[chipCatalog] Skipping row ${rowNumber} (${record.Name}): invalid DMG "${record.DMG}"`)
      return acc
    }

    const mb = parseNonNegativeInteger(record.MB)
    if (mb === null) {
      logWarning(`[chipCatalog] Skipping row ${rowNumber} (${record.Name}): invalid MB "${record.MB}"`)
      return acc
    }

    const lagSeconds = parseNonNegativeFloat(record.Lag)
    if (lagSeconds === null) {
      logWarning(`[chipCatalog] Skipping row ${rowNumber} (${record.Name}): invalid Lag "${record.Lag}"`)
      return acc
    }

    const recoilSeconds = parseNonNegativeFloat(record.Recoil)
    if (recoilSeconds === null) {
      logWarning(`[chipCatalog] Skipping row ${rowNumber} (${record.Name}): invalid Recoil "${record.Recoil}"`)
      return acc
    }

    let id: ChipRuntimeId
    try {
      id = normalizeChipId(record.Name)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      logWarning(`[chipCatalog] Skipping row ${rowNumber}: ${detail}`)
      return acc
    }

    if (acc[id]) {
      logWarning(`[chipCatalog] Skipping row ${rowNumber} (${record.Name}): duplicate chip id "${id}"`)
      return acc
    }

    acc[id] = {
      id,
      name: record.Name,
      damage,
      mb,
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
