import { describe, expect, it } from 'vitest'
import { chargingPowerFraction, integrateEnergyKwh } from '~~/server/utils/charging-curve'

describe('chargingPowerFraction', () => {
  it("è massima (1) all'inizio della sessione", () => {
    expect(chargingPowerFraction(0)).toBe(1)
  })

  it('è minima alla fine della sessione', () => {
    expect(chargingPowerFraction(1)).toBeCloseTo(0.15, 5)
  })

  it('decresce in modo monotono lungo tutta la sessione', () => {
    const samples = Array.from({ length: 21 }, (_, i) => chargingPowerFraction(i / 20))
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index] as number).toBeLessThanOrEqual(samples[index - 1] as number)
    }
  })

  it("è più ripida dopo l'80% che prima", () => {
    const dropBefore80 = chargingPowerFraction(0) - chargingPowerFraction(0.8)
    const dropAfter80 = chargingPowerFraction(0.8) - chargingPowerFraction(1)
    // Stesso intervallo di progresso (0.8), ma la seconda tratta scende di più.
    expect(dropAfter80).toBeGreaterThan(dropBefore80)
  })

  it('applica un clamp fuori da [0, 1]', () => {
    expect(chargingPowerFraction(-0.5)).toBe(chargingPowerFraction(0))
    expect(chargingPowerFraction(1.5)).toBe(chargingPowerFraction(1))
  })
})

describe('integrateEnergyKwh', () => {
  it('è zero se non è trascorso alcun tempo', () => {
    expect(integrateEnergyKwh(0, 3600, 22)).toBe(0)
  })

  it('cresce in modo monotono con il tempo trascorso', () => {
    const durationSeconds = 3600
    const maxPowerKw = 22
    const early = integrateEnergyKwh(600, durationSeconds, maxPowerKw)
    const later = integrateEnergyKwh(1800, durationSeconds, maxPowerKw)
    const full = integrateEnergyKwh(durationSeconds, durationSeconds, maxPowerKw)
    expect(later).toBeGreaterThan(early)
    expect(full).toBeGreaterThan(later)
  })

  it("l'energia di una sessione completa resta sotto il massimo teorico (potenza piena per tutta la durata)", () => {
    const durationSeconds = 3600
    const maxPowerKw = 22
    const theoreticalMax = maxPowerKw * (durationSeconds / 3600)
    const full = integrateEnergyKwh(durationSeconds, durationSeconds, maxPowerKw)
    expect(full).toBeLessThan(theoreticalMax)
    expect(full).toBeGreaterThan(0)
  })
})
