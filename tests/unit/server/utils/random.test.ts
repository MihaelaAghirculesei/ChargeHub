import { describe, expect, it } from 'vitest'
import { hashString, mulberry32 } from '~~/server/utils/random'

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('station-1-connector-10')).toBe(hashString('station-1-connector-10'))
  })

  it('produces different hashes for different strings', () => {
    expect(hashString('a')).not.toBe(hashString('b'))
  })

  it('always returns a non-negative 32-bit integer', () => {
    const hash = hashString('any string, even long and with special characters éà€')
    expect(Number.isInteger(hash)).toBe(true)
    expect(hash).toBeGreaterThanOrEqual(0)
    expect(hash).toBeLessThanOrEqual(0xffffffff)
  })
})

describe('mulberry32', () => {
  it('is deterministic: the same seed produces the same sequence', () => {
    const seed = hashString('test-seed')
    const sequenceA = Array.from({ length: 5 }, mulberry32(seed))
    const sequenceB = Array.from({ length: 5 }, mulberry32(seed))
    expect(sequenceA).toEqual(sequenceB)
  })

  it('always produces values in [0, 1)', () => {
    const random = mulberry32(hashString('range-check'))
    for (let index = 0; index < 200; index += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('different seeds produce different sequences', () => {
    const randomA = mulberry32(hashString('seed-a'))
    const randomB = mulberry32(hashString('seed-b'))
    expect(randomA()).not.toBe(randomB())
  })
})
