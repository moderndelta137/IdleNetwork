import attacksCsvRaw from './data/enemy-attacks.csv?raw'
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

export const loadEnemyAttackCatalog = (baseTickMs: number): Record<string, EnemyAttackDefinition> => {
  const rows = parseCsv(attacksCsvRaw)
  const records = csvRowsToRecords<EnemyAttackRow>(rows)

  return records.reduce<Record<string, EnemyAttackDefinition>>((acc, record) => {
    const lagSeconds = Number.parseFloat(record.Lag)
    const recoilSeconds = Number.parseFloat(record.Recoil)

    acc[record.Name] = {
      id: record.Name,
      actor: record.Actor,
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
  }, {})
}
