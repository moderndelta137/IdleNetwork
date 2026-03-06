export const parseCsv = (raw: string): string[][] => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return []
  }

  return lines.map((line) => {
    const row: string[] = []
    let currentCell = ''
    let inQuotes = false

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index]
      const nextChar = line[index + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"'
          index += 1
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (char === ',' && !inQuotes) {
        row.push(currentCell.trim())
        currentCell = ''
        continue
      }

      currentCell += char
    }

    row.push(currentCell.trim())
    return row
  })
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
