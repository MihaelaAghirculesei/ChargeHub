import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery } from 'h3'
import { describe, expect, it } from 'vitest'
import type { ReferenceData, Station, StationsPage } from '#shared/schemas/station'
import { stationRepository } from '~/modules/stations/repository'
import type { StationFilters, StationsTableOptions } from '~/modules/stations/types'

const filters: StationFilters = {
  latitude: 52.42,
  longitude: 10.79,
  radiusKm: 25,
  countryCode: 'DE',
  maxResults: 100,
  search: 'Rathaus',
  connectionTypeId: 25,
  minPowerKw: 11
}

const table: StationsTableOptions = {
  page: 2,
  itemsPerPage: 10,
  sortBy: 'name',
  sortOrder: 'desc'
}

describe('stationRepository.list', () => {
  it('traduce filtri e stato tabella nei query param di /api/stations', async () => {
    let capturedQuery: Record<string, unknown> = {}
    registerEndpoint('/api/stations', (event) => {
      capturedQuery = getQuery(event)
      return { items: [], total: 0 }
    })

    await stationRepository.list(filters, table)

    expect(capturedQuery).toMatchObject({
      lat: '52.42',
      lon: '10.79',
      radius: '25',
      countrycode: 'DE',
      maxresults: '100',
      search: 'Rathaus',
      connectiontypeid: '25',
      minpowerkw: '11',
      page: '2',
      itemsperpage: '10',
      sortby: 'name',
      sortorder: 'desc'
    })
    expect(capturedQuery.operatorid).toBeUndefined()
    expect(capturedQuery.statustypeid).toBeUndefined()
  })

  it('restituisce la pagina (items + total) così come arriva dal BFF', async () => {
    const page: StationsPage = { items: [{ id: 1 } as Station], total: 1 }
    registerEndpoint('/api/stations', () => page)

    await expect(stationRepository.list(filters, table)).resolves.toEqual(page)
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

describe('stationRepository.referenceData', () => {
  it('passa il countryCode come query param e restituisce le tabelle di lookup', async () => {
    let capturedQuery: Record<string, unknown> = {}
    const referenceData: ReferenceData = {
      connectionTypes: [{ id: 25, title: 'Type 2' }],
      operators: [{ id: 5, title: 'Enel X' }],
      statusTypes: [{ id: 50, title: 'Operational', isOperational: true }]
    }
    registerEndpoint('/api/reference-data', (event) => {
      capturedQuery = getQuery(event)
      return referenceData
    })

    await expect(stationRepository.referenceData('DE')).resolves.toEqual(referenceData)
    expect(capturedQuery).toMatchObject({ countrycode: 'DE' })
  })
})
