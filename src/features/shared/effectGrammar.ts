const integerPattern = /^-?\d+$/

const parseOffsets = (encoded: string): boolean => {
  const pairs = encoded
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => pair.length > 0)

  if (pairs.length === 0) {
    return false
  }

  return pairs.every((pair) => {
    const [x, y, ...extra] = pair.split('|').map((value) => value.trim())
    if (extra.length > 0 || !x || !y) {
      return false
    }

    return integerPattern.test(x) && integerPattern.test(y)
  })
}

const validateHitscanEffect = (effect: string): boolean => {
  const body = effect.slice('hitscan:rows='.length)
  const parts = body.split(';').map((part) => part.trim()).filter((part) => part.length > 0)
  if (parts.length === 0) {
    return false
  }

  const maxRangePart = parts.find((part) => part.startsWith('maxRange='))
  if (!maxRangePart || !/^maxRange=\d+$/.test(maxRangePart)) {
    return false
  }

  const piercePart = parts.find((part) => part.startsWith('pierce='))
  if (piercePart && !/^pierce=(true|false)$/.test(piercePart)) {
    return false
  }

  const rowParts = parts.filter((part) => !part.startsWith('maxRange=') && !part.startsWith('pierce='))
  if (rowParts.length === 0) {
    return false
  }

  return rowParts.every((row) => integerPattern.test(row))
}

export const validateEffectsGrammar = (effects: string): string | null => {
  const trimmed = effects.trim()
  if (trimmed.length === 0) {
    return 'Effects field is empty'
  }

  const chain = trimmed
    .split(',')
    .map((effect) => effect.trim())
    .filter((effect) => effect.length > 0)

  if (chain.length === 0) {
    return 'Effects chain is empty'
  }

  for (const effect of chain) {
    if (effect.startsWith('melee:offsets=')) {
      if (!parseOffsets(effect.slice('melee:offsets='.length))) {
        return `Invalid melee effect: ${effect}`
      }
      continue
    }

    if (effect.startsWith('throw:offsets=')) {
      if (!parseOffsets(effect.slice('throw:offsets='.length))) {
        return `Invalid throw effect: ${effect}`
      }
      continue
    }

    if (effect.startsWith('step:offset=')) {
      const value = effect.slice('step:offset='.length)
      const [x, y, ...extra] = value.split('|').map((part) => part.trim())
      if (!x || !y || extra.length > 0 || !integerPattern.test(x) || !integerPattern.test(y)) {
        return `Invalid step effect: ${effect}`
      }
      continue
    }

    if (effect.startsWith('hitscan:rows=')) {
      if (!validateHitscanEffect(effect)) {
        return `Invalid hitscan effect: ${effect}`
      }
      continue
    }

    if (effect.startsWith('heal:amount=')) {
      if (!/^heal:amount=\d+$/.test(effect)) {
        return `Invalid heal effect: ${effect}`
      }
      continue
    }

    if (effect.startsWith('barrier:charges=')) {
      if (!/^barrier:charges=\d+$/.test(effect)) {
        return `Invalid barrier effect: ${effect}`
      }
      continue
    }

    return `Unsupported effect section: ${effect}`
  }

  return null
}
