import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { parseCsv } from '../src/features/shared/csv.ts'
import { validateEffectsGrammar } from '../src/features/shared/effectGrammar.ts'

const repoRoot = process.cwd()

const loadPatchedTsModule = async (sourceRelativePath) => {
  const sourcePath = path.join(repoRoot, sourceRelativePath)
  const sourceDir = path.dirname(sourcePath)
  let code = readFileSync(sourcePath, 'utf8')

  code = code.replace("'../shared/effectGrammar'", `'${pathToFileURL(path.join(repoRoot, 'src/features/shared/effectGrammar.ts')).href}'`)
  code = code.replace("'../shared/csv'", `'${pathToFileURL(path.join(repoRoot, 'src/features/shared/csv.ts')).href}'`)

  const tempDir = mkdtempSync(path.join(tmpdir(), 'idle-network-tests-'))
  const tempFile = path.join(tempDir, path.basename(sourcePath))
  writeFileSync(tempFile, code)

  return import(pathToFileURL(tempFile).href)
}

test('parseCsv keeps quoted comma fields intact', () => {
  const raw = [
    'Name,Effects',
    'StepSword,"step:offset=2|0,melee:offsets=1|0"'
  ].join('\n')

  const rows = parseCsv(raw)
  assert.equal(rows[1][0], 'StepSword')
  assert.equal(rows[1][1], 'step:offset=2|0,melee:offsets=1|0')
})

test('validateEffectsGrammar rejects malformed effects', () => {
  assert.equal(validateEffectsGrammar('throw:offsets=3|0'), null)
  assert.equal(validateEffectsGrammar('projectile:rows=0;maxRange=6;speed=2'), null)
  assert.equal(validateEffectsGrammar('projectile:rows=0;maxRange=6;speed=2;pierce=true'), null)
  assert.equal(validateEffectsGrammar('dash:maxRange=6;speed=3;passes=2'), null)
  assert.match(validateEffectsGrammar('throw:offsets=bad') ?? '', /Invalid throw effect/)
  assert.match(validateEffectsGrammar('projectile:rows=0;maxRange=6') ?? '', /Invalid projectile effect/)
  assert.match(validateEffectsGrammar('projectile:rows=0;maxRange=6;speed=2;pierce=maybe') ?? '', /Invalid projectile effect/)
  assert.match(validateEffectsGrammar('dash:maxRange=6;speed=3') ?? '', /Invalid dash effect/)
  assert.match(validateEffectsGrammar('unknown:foo=1') ?? '', /Unsupported effect section/)
})

test('loadChipCatalogFromCsv skips malformed rows and logs warnings', async () => {
  const { loadChipCatalogFromCsv } = await loadPatchedTsModule('src/features/chips/chipCatalogLoader.ts')
  const warnings = []

  const raw = [
    'Name,DMG,MB,Type,Description,Lag,Recoil,Effects',
    'Cannon,20,4,Hitscan,OK,0.2,0.4,hitscan:rows=0;maxRange=6;pierce=false',
    'BadChip,abc,4,Hitscan,Bad dmg,0.2,0.4,hitscan:rows=0;maxRange=6;pierce=false',
    'BrokenEffect,10,2,Throw,Bad effect,0.2,0.4,throw:offsets=nope',
    'UnknownName,10,2,Hitscan,Unknown id,0.2,0.4,hitscan:rows=0;maxRange=6;pierce=false'
  ].join('\n')

  const catalog = loadChipCatalogFromCsv(raw, 100, (m) => warnings.push(m))

  assert.deepEqual(Object.keys(catalog), ['cannon'])
  assert.equal(catalog.cannon.damage, 20)
  assert.equal(warnings.length, 3)
})

test('loadEnemyAttackCatalogFromCsv skips malformed rows and logs warnings', async () => {
  const { loadEnemyAttackCatalogFromCsv } = await loadPatchedTsModule('src/features/enemies/enemyAttackCatalogLoader.ts')
  const warnings = []

  const raw = [
    'Name,Actor,DMG,Type,Description,Lag,Recoil,Effects',
    'MettaurSwing,mettaur,6,Melee,OK,0.4,0.6,melee:offsets=-1|0;-2|0',
    'FireManFireball,fireman,20,Projectile,OK,0.4,1.1,projectile:rows=0;maxRange=6;speed=2;pierce=true',
    'FishyDash,fishy,18,Dash,OK,1.0,1.1,dash:maxRange=6;speed=3;passes=2',
    'BrokenLag,mettaur,6,Melee,Bad lag,nope,0.6,melee:offsets=-1|0',
    'BrokenEffect,mettaur,6,Melee,Bad effect,0.4,0.6,step:offset=bad'
  ].join('\n')

  const catalog = loadEnemyAttackCatalogFromCsv(raw, 100, (m) => warnings.push(m))

  assert.deepEqual(Object.keys(catalog), ['MettaurSwing', 'FireManFireball', 'FishyDash'])
  assert.equal(catalog.MettaurSwing.damage, 6)
  assert.equal(warnings.length, 2)
})
