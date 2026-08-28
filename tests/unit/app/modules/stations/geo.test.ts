import { describe, expect, it } from 'vitest'
import { haversineDistanceKm } from '~/modules/stations/geo'

describe('haversineDistanceKm', () => {
  it('returns 0 for two identical points', () => {
    expect(
      haversineDistanceKm(
        { latitude: 52.42, longitude: 10.79 },
        { latitude: 52.42, longitude: 10.79 }
      )
    ).toBe(0)
  })

  it('computes a known distance (Wolfsburg → Berlin, about 180km)', () => {
    const wolfsburg = { latitude: 52.42, longitude: 10.79 }
    const berlin = { latitude: 52.52, longitude: 13.405 }

    const distance = haversineDistanceKm(wolfsburg, berlin)

    expect(distance).toBeGreaterThan(170)
    expect(distance).toBeLessThan(190)
  })

  it('is symmetric (a→b equals b→a)', () => {
    const a = { latitude: 52.42, longitude: 10.79 }
    const b = { latitude: 48.14, longitude: 11.58 }

    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10)
  })
})
