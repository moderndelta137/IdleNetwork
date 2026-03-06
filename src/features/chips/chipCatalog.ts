import chipsCsvRaw from './data/chips.csv?raw'
import { loadChipCatalogFromCsv } from './chipCatalogLoader'

export type { ChipDefinition, ChipRuntimeId } from './chipCatalogLoader'

export const loadChipCatalog = (baseTickMs: number) => loadChipCatalogFromCsv(chipsCsvRaw, baseTickMs)
