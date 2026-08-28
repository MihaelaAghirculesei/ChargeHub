import { describe, expect, it } from 'vitest'
import { compareTariffs } from '~/modules/tariffs/domain/compare-tariffs'
import type { Tariff } from '~/modules/tariffs/domain/tariff'

function makeTariff(overrides: Partial<Tariff> = {}): Tariff {
  return {
    id: 'tariff-1',
    name: 'Standard',
    pricePerKwh: 0.45,
    blockingFeePerMinute: 0.1,
    monthlyFeeEur: 9.99,
    ...overrides
  }
}

describe('compareTariffs', () => {
  it('returns an empty array when there are no tariffs', () => {
    expect(compareTariffs({ energyKwh: 10 }, [])).toEqual([])
  })

  it('computes the cost for each tariff, with the correct id and name', () => {
    const tariffs = [
      makeTariff({ id: 'a', name: 'Günstig', pricePerKwh: 0.3 }),
      makeTariff({ id: 'b', name: 'Teuer', pricePerKwh: 0.6 })
    ]
    const results = compareTariffs({ energyKwh: 10 }, tariffs)

    expect(results).toContainEqual({ tariffId: 'a', tariffName: 'Günstig', costEur: 3 })
    expect(results).toContainEqual({ tariffId: 'b', tariffName: 'Teuer', costEur: 6 })
  })

  it('sorts from the cheapest result to the most expensive', () => {
    const tariffs = [
      makeTariff({ id: 'a', name: 'Teuer', pricePerKwh: 0.6 }),
      makeTariff({ id: 'b', name: 'Günstig', pricePerKwh: 0.3 }),
      makeTariff({ id: 'c', name: 'Medio', pricePerKwh: 0.45 })
    ]
    const results = compareTariffs({ energyKwh: 10 }, tariffs)

    expect(results.map((r) => r.tariffId)).toEqual(['b', 'c', 'a'])
  })

  it('propagates the overstay minutes to each calculation', () => {
    const tariffs = [makeTariff({ id: 'a', pricePerKwh: 0.5, blockingFeePerMinute: 0.2 })]
    const results = compareTariffs({ energyKwh: 10 }, tariffs, 10)

    // 10 * 0.5 = 5, + 10 * 0.2 = 2 → 7
    expect(results[0]?.costEur).toBe(7)
  })
})
