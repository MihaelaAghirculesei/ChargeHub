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
  it('costs only energy × price/kWh when there is no overstay past the charge', () => {
    const cost = calculateSessionCost({ energyKwh: 10 }, makeTariff({ pricePerKwh: 0.45 }))
    expect(cost).toBe(4.5)
  })

  it('adds the blocking fee for the given overstay minutes', () => {
    const cost = calculateSessionCost(
      { energyKwh: 10 },
      makeTariff({ pricePerKwh: 0.45, blockingFeePerMinute: 0.1 }),
      20
    )
    // 10 * 0.45 = 4.5, + 20 * 0.1 = 2 → 6.5
    expect(cost).toBe(6.5)
  })

  it('negative overstay minutes are treated as zero, they do not subtract cost', () => {
    const withoutOverstay = calculateSessionCost({ energyKwh: 10 }, makeTariff())
    const withNegativeOverstay = calculateSessionCost({ energyKwh: 10 }, makeTariff(), -15)
    expect(withNegativeOverstay).toBe(withoutOverstay)
  })

  it('the monthly fee never affects the cost of a single session', () => {
    const cheapMonthly = calculateSessionCost({ energyKwh: 10 }, makeTariff({ monthlyFeeEur: 0 }))
    const expensiveMonthly = calculateSessionCost(
      { energyKwh: 10 },
      makeTariff({ monthlyFeeEur: 999 })
    )
    expect(expensiveMonthly).toBe(cheapMonthly)
  })

  it('rounds to 2 decimals, even with floating-point errors', () => {
    const cost = calculateSessionCost(
      { energyKwh: 0.1 },
      makeTariff({ pricePerKwh: 0.2, blockingFeePerMinute: 0 })
    )
    expect(cost).toBe(0.02)
  })

  it('with energy and overstay at zero the cost is zero', () => {
    const cost = calculateSessionCost({ energyKwh: 0 }, makeTariff(), 0)
    expect(cost).toBe(0)
  })
})
