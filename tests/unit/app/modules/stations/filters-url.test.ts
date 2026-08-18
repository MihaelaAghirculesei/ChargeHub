import { describe, expect, it } from 'vitest'
import { filtersToQuery, parseFiltersFromQuery } from '~/modules/stations/filters-url'
import type { StationFilters } from '~/modules/stations/types'

const baseFilters: StationFilters = {
  latitude: 52.42,
  longitude: 10.79,
  radiusKm: 25,
  countryCode: 'DE',
  maxResults: 100
}

describe('parseFiltersFromQuery', () => {
  it('legge tutti i campi filtro presenti nella query, incluse le coordinate', () => {
    expect(
      parseFiltersFromQuery({
        lat: '52.42',
        lon: '10.79',
        radius: '25',
        search: 'Rathaus',
        connectiontypeid: '25',
        operatorid: '5',
        statustypeid: '50',
        minpowerkw: '11'
      })
    ).toEqual({
      latitude: 52.42,
      longitude: 10.79,
      radiusKm: 25,
      search: 'Rathaus',
      connectionTypeId: 25,
      operatorId: 5,
      statusTypeId: 50,
      minPowerKw: 11
    })
  })

  it('restituisce undefined per i campi assenti, invalidi o vuoti', () => {
    expect(parseFiltersFromQuery({})).toEqual({
      latitude: undefined,
      longitude: undefined,
      radiusKm: undefined,
      search: undefined,
      connectionTypeId: undefined,
      operatorId: undefined,
      statusTypeId: undefined,
      minPowerKw: undefined
    })
    expect(parseFiltersFromQuery({ connectiontypeid: 'abc', search: '' })).toMatchObject({
      search: undefined,
      connectionTypeId: undefined
    })
  })

  it('prende il primo valore quando lo stesso param compare più volte', () => {
    expect(parseFiltersFromQuery({ search: ['Rathaus', 'Stadtwerke'] })).toMatchObject({
      search: 'Rathaus'
    })
  })

  it('scarta un ID non positivo o non intero', () => {
    expect(parseFiltersFromQuery({ operatorid: '-5' }).operatorId).toBeUndefined()
    expect(parseFiltersFromQuery({ operatorid: '2.5' }).operatorId).toBeUndefined()
  })

  it('accetta latitudine/longitudine negative o zero, non solo positive', () => {
    expect(parseFiltersFromQuery({ lat: '-33.87', lon: '0' })).toMatchObject({
      latitude: -33.87,
      longitude: 0
    })
  })

  it('scarta coordinate fuori dal range valido', () => {
    expect(parseFiltersFromQuery({ lat: '95' }).latitude).toBeUndefined()
    expect(parseFiltersFromQuery({ lon: '-200' }).longitude).toBeUndefined()
  })
})

describe('filtersToQuery', () => {
  it('serializza sempre le coordinate e solo i filtri opzionali attivi', () => {
    expect(filtersToQuery({ ...baseFilters, search: 'Rathaus', minPowerKw: 11 })).toEqual({
      lat: '52.42',
      lon: '10.79',
      radius: '25',
      search: 'Rathaus',
      connectiontypeid: undefined,
      operatorid: undefined,
      statustypeid: undefined,
      minpowerkw: '11'
    })
  })

  it('round-trip: parse(serialize(filtri)) restituisce gli stessi filtri', () => {
    const filters: StationFilters = {
      ...baseFilters,
      latitude: 48.14,
      longitude: 11.58,
      radiusKm: 10,
      search: 'Stadtwerke',
      connectionTypeId: 25,
      operatorId: 5,
      statusTypeId: 50,
      minPowerKw: 22
    }

    const roundTripped = parseFiltersFromQuery(filtersToQuery(filters))

    expect(roundTripped).toEqual({
      latitude: 48.14,
      longitude: 11.58,
      radiusKm: 10,
      search: 'Stadtwerke',
      connectionTypeId: 25,
      operatorId: 5,
      statusTypeId: 50,
      minPowerKw: 22
    })
  })
})
