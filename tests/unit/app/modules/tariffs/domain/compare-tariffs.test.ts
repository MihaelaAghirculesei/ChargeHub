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
  it('restituisce un array vuoto se non ci sono tariffe', () => {
    expect(compareTariffs({ energyKwh: 10 }, [])).toEqual([])
  })

  it('calcola il costo per ciascuna tariffa, con id e nome corretti', () => {
    const tariffs = [
      makeTariff({ id: 'a', name: 'Günstig', pricePerKwh: 0.3 }),
      makeTariff({ id: 'b', name: 'Teuer', pricePerKwh: 0.6 })
    ]
    const results = compareTariffs({ energyKwh: 10 }, tariffs)

    expect(results).toContainEqual({ tariffId: 'a', tariffName: 'Günstig', costEur: 3 })
    expect(results).toContainEqual({ tariffId: 'b', tariffName: 'Teuer', costEur: 6 })
  })

  it('ordina dal risultato più economico al più caro', () => {
    const tariffs = [
      makeTariff({ id: 'a', name: 'Teuer', pricePerKwh: 0.6 }),
      makeTariff({ id: 'b', name: 'Günstig', pricePerKwh: 0.3 }),
      makeTariff({ id: 'c', name: 'Medio', pricePerKwh: 0.45 })
    ]
    const results = compareTariffs({ energyKwh: 10 }, tariffs)

    expect(results.map((r) => r.tariffId)).toEqual(['b', 'c', 'a'])
  })

  it('propaga i minuti di sosta a ciascun calcolo', () => {
    const tariffs = [makeTariff({ id: 'a', pricePerKwh: 0.5, blockingFeePerMinute: 0.2 })]
    const results = compareTariffs({ energyKwh: 10 }, tariffs, 10)

    // 10 * 0.5 = 5, + 10 * 0.2 = 2 → 7
    expect(results[0]?.costEur).toBe(7)
  })
})
