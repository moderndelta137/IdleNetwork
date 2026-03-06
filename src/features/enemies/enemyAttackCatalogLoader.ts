import { validateEffectsGrammar } from '../shared/effectGrammar'
import { csvRowsToRecords, parseCsv, secondsToTicks } from '../shared/csv'

type EnemyAttackRow = {
  Name: string
  Actor: string
  DMG: string
  Type: string
  Description: string
  Lag: string
  Recoil: string
  Effects: string
}

export type EnemyAttackDefinition = {
  id: string
  actor: string
  damage: number
  type: string
  description: string
  lagSeconds: number
  recoilSeconds: number
  lagTicks: number
  recoilTicks: number
  effects: string
}

type CatalogWarningLogger = (message: string) => void

const parseNonNegativeInteger = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const parseNonNegativeFloat = (value: string): number | null => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export const loadEnemyAttackCatalogFromCsv = (
  csvRaw: string,
  baseTickMs: number,
  logWarning: CatalogWarningLogger = (message) => console.warn(message)
): Record<string, EnemyAttackDefinition> => {
  const rows = parseCsv(csvRaw)
  const records = csvRowsToRecords<EnemyAttackRow>(rows)

  return records.reduce<Record<string, EnemyAttackDefinition>>((acc, record, index) => {
    const rowNumber = index + 2

    if (!record.Name || !record.Actor || !record.Type || !record.Effects) {
      logWarning(`[enemyAttackCatalog] Skipping row ${rowNumber}: missing required fields (Name/Actor/Type/Effects)`)
      return acc
    }

    const effectsValidationError = validateEffectsGrammar(record.Effects)
    if (effectsValidationError) {
      logWarning(`[enemyAttackCatalog] Skipping row ${rowNumber} (${record.Name}): ${effectsValidationError}`)
      return acc
    }

    const damage = parseNonNegativeInteger(record.DMG)
    if (damage === null) {
      logWarning(`[enemyAttackCatalog] Skipping row ${rowNumber} (${record.Name}): invalid DMG "${record.DMG}"`)
      return acc
    }

    const lagSeconds = parseNonNegativeFloat(record.Lag)
    if (lagSeconds === null) {
      logWarning(`[enemyAttackCatalog] Skipping row ${rowNumber} (${record.Name}): invalid Lag "${record.Lag}"`)
      return acc
    }

    const recoilSeconds = parseNonNegativeFloat(record.Recoil)
    if (recoilSeconds === null) {
      logWarning(`[enemyAttackCatalog] Skipping row ${rowNumber} (${record.Name}): invalid Recoil "${record.Recoil}"`)
      return acc
    }

    if (acc[record.Name]) {
      logWarning(`[enemyAttackCatalog] Skipping row ${rowNumber} (${record.Name}): duplicate attack name`)
      return acc
    }

    acc[record.Name] = {
      id: record.Name,
      actor: record.Actor,
      damage,
      type: record.Type,
      description: record.Description,
      lagSeconds,
      recoilSeconds,
      lagTicks: secondsToTicks(lagSeconds, baseTickMs),
      recoilTicks: secondsToTicks(recoilSeconds, baseTickMs),
      effects: record.Effects
    }

    return acc
  }, {})
}
