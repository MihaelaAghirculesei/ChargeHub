import { describe, expect, it } from 'vitest'
import { hashString, mulberry32 } from '~~/server/utils/random'

describe('hashString', () => {
  it('è deterministico', () => {
    expect(hashString('station-1-connector-10')).toBe(hashString('station-1-connector-10'))
  })

  it('produce hash diversi per stringhe diverse', () => {
    expect(hashString('a')).not.toBe(hashString('b'))
  })

  it('restituisce sempre un intero a 32 bit non negativo', () => {
    const hash = hashString('qualunque stringa, anche lunga e con caratteri speciali éà€')
    expect(Number.isInteger(hash)).toBe(true)
    expect(hash).toBeGreaterThanOrEqual(0)
    expect(hash).toBeLessThanOrEqual(0xffffffff)
  })
})

describe('mulberry32', () => {
  it('è deterministico: stesso seed produce la stessa sequenza', () => {
    const seed = hashString('seed-di-prova')
    const sequenceA = Array.from({ length: 5 }, mulberry32(seed))
    const sequenceB = Array.from({ length: 5 }, mulberry32(seed))
    expect(sequenceA).toEqual(sequenceB)
  })

  it('produce valori sempre in [0, 1)', () => {
    const random = mulberry32(hashString('range-check'))
    for (let index = 0; index < 200; index += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('seed diversi producono sequenze diverse', () => {
    const randomA = mulberry32(hashString('seed-a'))
    const randomB = mulberry32(hashString('seed-b'))
    expect(randomA()).not.toBe(randomB())
  })
})
