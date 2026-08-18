import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery } from 'h3'
import { describe, expect, it } from 'vitest'
import type { Station } from '#shared/schemas/station'
import { stationRepository } from '~/modules/stations/repository'
import type { StationFilters } from '~/modules/stations/types'

const filters: StationFilters = {
  latitude: 52.42,
  longitude: 10.79,
  radiusKm: 25,
  countryCode: 'DE',
  maxResults: 50,
  connectionTypeId: 25,
  minPowerKw: 11
}

describe('stationRepository.list', () => {
  it('traduce i filtri di dominio nei query param di /api/stations', async () => {
    let capturedQuery: Record<string, unknown> = {}
    registerEndpoint('/api/stations', (event) => {
      capturedQuery = getQuery(event)
      return []
    })

    await stationRepository.list(filters)

    expect(capturedQuery).toMatchObject({
      lat: '52.42',
      lon: '10.79',
      radius: '25',
      countrycode: 'DE',
      maxresults: '50',
      connectiontypeid: '25',
      minpowerkw: '11'
    })
    expect(capturedQuery.operatorid).toBeUndefined()
    expect(capturedQuery.statustypeid).toBeUndefined()
  })

  it('restituisce le stazioni normalizzate ricevute dal BFF', async () => {
    const stations = [{ id: 1 }] as Station[]
    registerEndpoint('/api/stations', () => stations)

    await expect(stationRepository.list(filters)).resolves.toEqual(stations)
  })
})

describe('stationRepository.getById', () => {
  it('restituisce null su 404 invece di lanciare', async () => {
    registerEndpoint('/api/stations/999999', () => {
      throw createError({ statusCode: 404, statusMessage: 'Stazione non trovata.' })
    })

    await expect(stationRepository.getById(999999)).resolves.toBeNull()
  })

  it('propaga qualunque altro errore', async () => {
    registerEndpoint('/api/stations/1', () => {
      throw createError({ statusCode: 502, statusMessage: 'Impossibile recuperare la stazione.' })
    })

    await expect(stationRepository.getById(1)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('restituisce la stazione quando trovata', async () => {
    const station = { id: 42 } as Station
    registerEndpoint('/api/stations/42', () => station)

    await expect(stationRepository.getById(42)).resolves.toEqual(station)
  })
})
