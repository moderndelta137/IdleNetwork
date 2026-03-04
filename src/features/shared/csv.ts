export const parseCsv = (raw: string): string[][] => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return []
  }

  return lines.map((line) =>
    line
      .split(',')
      .map((cell) => cell.trim())
  )
}

export const csvRowsToRecords = <T extends Record<string, string>>(rows: string[][]): T[] => {
  if (rows.length <= 1) {
    return []
  }

  const header = rows[0]
  return rows.slice(1).map((row) => {
    const entry: Record<string, string> = {}

    header.forEach((key, index) => {
      entry[key] = row[index] ?? ''
    })

    return entry as T
  })
}

export const secondsToTicks = (seconds: number, baseTickMs: number): number => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0
  }

  return Math.max(1, Math.round((seconds * 1000) / baseTickMs))
}
