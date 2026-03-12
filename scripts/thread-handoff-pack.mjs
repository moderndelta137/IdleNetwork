#!/usr/bin/env node

const lines = [
  'THREAD_HANDOFF batch operation',
  '',
  'Step 1 — Update required handoff docs in this order:',
  '  1) docs/M1_HANDOFF.md',
  '  2) V1_PRODUCT_PLAN.md',
  '  3) GDD.md',
  '',
  'Step 2 — Confirm required checks before PR:',
  '  - npm run check:game-store-duplicates',
  '  - npm run build',
  '',
  'Step 3 — New thread read pack (share this list verbatim):',
  '  1. docs/M1_HANDOFF.md',
  '  2. V1_PRODUCT_PLAN.md',
  '  3. GDD.md',
  '  4. AGENT.md',
  '  5. src/features/chips/data/chips.csv',
  '  6. src/features/chips/data/effect-grammar.csv',
  '  7. src/features/chips/data/README.md',
  '  8. src/features/enemies/data/enemy-attacks.csv',
  '  9. src/features/enemies/data/README.md',
  '  10. public/fonts/jersey-10/README.md',
  '  11. public/sprites/fireman/ (latest assets from main)',
  '',
  'Usage:',
  '  npm run handoff:thread'
]

process.stdout.write(`${lines.join('\n')}\n`)
