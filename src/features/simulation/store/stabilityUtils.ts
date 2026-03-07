export const sanitizeQueuedChipSlot = <T>(chipHand: Array<T | null>, queuedChipSlot: number | null): number | null => {
  if (queuedChipSlot === null) {
    return null
  }

  if (queuedChipSlot < 0 || queuedChipSlot >= chipHand.length) {
    return null
  }

  return chipHand[queuedChipSlot] ? queuedChipSlot : null
}

const createDeterministicRng = (seed: number): (() => number) => {
  let state = seed >>> 0

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

export const shuffleChipsDeterministic = <T>(chips: T[], seed: number): T[] => {
  const shuffled = [...chips]
  const random = createDeterministicRng(seed)

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const temp = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = temp
  }

  return shuffled
}
