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

test('sanitizeQueuedChipSlot clears stale queue after hand mutation', () => {
  const originalHand = ['slot0', 'slot1', 'slot2', null]
  const queuedSlot = 2
  assert.equal(sanitizeQueuedChipSlot(originalHand, queuedSlot), 2)

  const mutatedHand = [originalHand[0], originalHand[1], null, originalHand[3]]
  assert.equal(sanitizeQueuedChipSlot(mutatedHand, queuedSlot), null)
})

test('shuffleChipsDeterministic is reproducible by seed', () => {
  const chips = ['a', 'b', 'c', 'd', 'e']
  const shuffledA = shuffleChipsDeterministic(chips, 42)
  const shuffledB = shuffleChipsDeterministic(chips, 42)
  const shuffledC = shuffleChipsDeterministic(chips, 99)

  assert.deepEqual(shuffledA, shuffledB)
  assert.notDeepEqual(shuffledA, shuffledC)
  assert.deepEqual([...shuffledA].sort(), [...chips].sort())
  assert.deepEqual(chips, ['a', 'b', 'c', 'd', 'e'])
})

test('deterministic shuffle remains stable across long-run replay', () => {
  const baseDeck = Array.from({ length: 30 }, (_, index) => `chip-${index + 1}`)

  const runReplay = () => {
    let deck = [...baseDeck]
    const history = []

    for (let tick = 1; tick <= 500; tick += 1) {
      deck = shuffleChipsDeterministic(deck, tick)
      history.push(deck[0])
      const drawn = deck.shift()
      if (drawn) {
        deck.push(drawn)
      }
    }

    return history
  }

  const firstRun = runReplay()
  const secondRun = runReplay()

  assert.deepEqual(firstRun, secondRun)
  assert.equal(firstRun.length, 500)
})
