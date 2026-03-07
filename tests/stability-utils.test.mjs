import test from 'node:test'
import assert from 'node:assert/strict'

import { sanitizeQueuedChipSlot, shuffleChipsDeterministic } from '../src/features/simulation/store/stabilityUtils.ts'

test('sanitizeQueuedChipSlot returns null for invalid/empty slots', () => {
  const hand = ['a', null, 'c']
  assert.equal(sanitizeQueuedChipSlot(hand, null), null)
  assert.equal(sanitizeQueuedChipSlot(hand, -1), null)
  assert.equal(sanitizeQueuedChipSlot(hand, 3), null)
  assert.equal(sanitizeQueuedChipSlot(hand, 1), null)
  assert.equal(sanitizeQueuedChipSlot(hand, 0), 0)
  assert.equal(sanitizeQueuedChipSlot(hand, 2), 2)
})

test('shuffleChipsDeterministic is reproducible by seed', () => {
  const chips = ['a', 'b', 'c', 'd', 'e']
  const shuffledA = shuffleChipsDeterministic(chips, 42)
  const shuffledB = shuffleChipsDeterministic(chips, 42)
  const shuffledC = shuffleChipsDeterministic(chips, 99)

  assert.deepEqual(shuffledA, shuffledB)
  assert.notDeepEqual(shuffledA, shuffledC)
  assert.deepEqual([...shuffledA].sort(), [...chips].sort())
})
