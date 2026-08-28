import { describe, expect, it } from 'vitest'
import { chargingPowerFraction, integrateEnergyKwh } from '~~/server/utils/charging-curve'

describe('chargingPowerFraction', () => {
  it('is at its maximum (1) at the start of the session', () => {
    expect(chargingPowerFraction(0)).toBe(1)
  })

  it('is at its minimum at the end of the session', () => {
    expect(chargingPowerFraction(1)).toBeCloseTo(0.15, 5)
  })

  it('decreases monotonically across the whole session', () => {
    const samples = Array.from({ length: 21 }, (_, i) => chargingPowerFraction(i / 20))
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index] as number).toBeLessThanOrEqual(samples[index - 1] as number)
    }
  })

  it('is steeper after 80% than before', () => {
    const dropBefore80 = chargingPowerFraction(0) - chargingPowerFraction(0.8)
    const dropAfter80 = chargingPowerFraction(0.8) - chargingPowerFraction(1)
    // Same progress interval (0.8), but the second stretch drops more.
    expect(dropAfter80).toBeGreaterThan(dropBefore80)
  })

  it('clamps outside [0, 1]', () => {
    expect(chargingPowerFraction(-0.5)).toBe(chargingPowerFraction(0))
    expect(chargingPowerFraction(1.5)).toBe(chargingPowerFraction(1))
  })
})

describe('integrateEnergyKwh', () => {
  it('is zero when no time has elapsed', () => {
    expect(integrateEnergyKwh(0, 3600, 22)).toBe(0)
  })

  it('grows monotonically with the elapsed time', () => {
    const durationSeconds = 3600
    const maxPowerKw = 22
    const early = integrateEnergyKwh(600, durationSeconds, maxPowerKw)
    const later = integrateEnergyKwh(1800, durationSeconds, maxPowerKw)
    const full = integrateEnergyKwh(durationSeconds, durationSeconds, maxPowerKw)
    expect(later).toBeGreaterThan(early)
    expect(full).toBeGreaterThan(later)
  })

  it('the energy of a full session stays below the theoretical max (full power for the whole duration)', () => {
    const durationSeconds = 3600
    const maxPowerKw = 22
    const theoreticalMax = maxPowerKw * (durationSeconds / 3600)
    const full = integrateEnergyKwh(durationSeconds, durationSeconds, maxPowerKw)
    expect(full).toBeLessThan(theoreticalMax)
    expect(full).toBeGreaterThan(0)
  })
})
