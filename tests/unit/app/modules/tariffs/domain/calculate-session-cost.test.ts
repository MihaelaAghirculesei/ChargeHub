import { describe, expect, it } from 'vitest'
import { calculateSessionCost } from '~/modules/tariffs/domain/calculate-session-cost'
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

describe('calculateSessionCost', () => {
  it("costa solo energia × prezzo/kWh quando non c'è sosta oltre la ricarica", () => {
    const cost = calculateSessionCost({ energyKwh: 10 }, makeTariff({ pricePerKwh: 0.45 }))
    expect(cost).toBe(4.5)
  })

  it('aggiunge la tariffa di blocco per i minuti di sosta indicati', () => {
    const cost = calculateSessionCost(
      { energyKwh: 10 },
      makeTariff({ pricePerKwh: 0.45, blockingFeePerMinute: 0.1 }),
      20
    )
    // 10 * 0.45 = 4.5, + 20 * 0.1 = 2 → 6.5
    expect(cost).toBe(6.5)
  })

  it('minuti di sosta negativi vengono trattati come zero, non sottraggono costo', () => {
    const withoutOverstay = calculateSessionCost({ energyKwh: 10 }, makeTariff())
    const withNegativeOverstay = calculateSessionCost({ energyKwh: 10 }, makeTariff(), -15)
    expect(withNegativeOverstay).toBe(withoutOverstay)
  })

  it('il canone mensile non influisce mai sul costo di una singola sessione', () => {
    const cheapMonthly = calculateSessionCost({ energyKwh: 10 }, makeTariff({ monthlyFeeEur: 0 }))
    const expensiveMonthly = calculateSessionCost(
      { energyKwh: 10 },
      makeTariff({ monthlyFeeEur: 999 })
    )
    expect(expensiveMonthly).toBe(cheapMonthly)
  })

  it('arrotonda a 2 decimali, anche in presenza di errori di virgola mobile', () => {
    const cost = calculateSessionCost(
      { energyKwh: 0.1 },
      makeTariff({ pricePerKwh: 0.2, blockingFeePerMinute: 0 })
    )
    expect(cost).toBe(0.02)
  })

  it('con energia e sosta a zero il costo è zero', () => {
    const cost = calculateSessionCost({ energyKwh: 0 }, makeTariff(), 0)
    expect(cost).toBe(0)
  })
})
