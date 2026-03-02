import { readFileSync } from 'node:fs'

const sourcePath = 'src/features/simulation/store/gameStore.ts'
const source = readFileSync(sourcePath, 'utf8')

const checks = [
  { label: 'tryUseChipFromSlot', regex: /const\s+tryUseChipFromSlot\s*=\s*\(/g },
  { label: 'chooseAutoChipSlot', regex: /const\s+chooseAutoChipSlot\s*=\s*\(/g }
]

let hasError = false

for (const check of checks) {
  const matches = source.match(check.regex) ?? []
  if (matches.length !== 1) {
    hasError = true
    console.error(
      `[check-game-store-duplicates] Expected 1 declaration for ${check.label}, found ${matches.length}.`
    )
  }
}

if (hasError) {
  process.exit(1)
}

console.log('[check-game-store-duplicates] OK')
