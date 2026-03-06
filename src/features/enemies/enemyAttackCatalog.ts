import attacksCsvRaw from './data/enemy-attacks.csv?raw'
import { loadEnemyAttackCatalogFromCsv } from './enemyAttackCatalogLoader'

export type { EnemyAttackDefinition } from './enemyAttackCatalogLoader'

export const loadEnemyAttackCatalog = (baseTickMs: number) => loadEnemyAttackCatalogFromCsv(attacksCsvRaw, baseTickMs)
