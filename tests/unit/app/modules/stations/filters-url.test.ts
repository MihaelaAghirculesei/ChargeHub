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
  it('legge tutti i campi filtro presenti nella query', () => {
    expect(
      parseFiltersFromQuery({
        search: 'Rathaus',
        connectiontypeid: '25',
        operatorid: '5',
        statustypeid: '50',
        minpowerkw: '11'
      })
    ).toEqual({
      search: 'Rathaus',
      connectionTypeId: 25,
      operatorId: 5,
      statusTypeId: 50,
      minPowerKw: 11
    })
  })

  it('restituisce undefined per i campi assenti, invalidi o vuoti', () => {
    expect(parseFiltersFromQuery({})).toEqual({
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
})

describe('filtersToQuery', () => {
  it('serializza solo i filtri attivi, undefined per quelli assenti', () => {
    expect(filtersToQuery({ ...baseFilters, search: 'Rathaus', minPowerKw: 11 })).toEqual({
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
      search: 'Stadtwerke',
      connectionTypeId: 25,
      operatorId: 5,
      statusTypeId: 50,
      minPowerKw: 22
    }

    const roundTripped = parseFiltersFromQuery(filtersToQuery(filters))

    expect(roundTripped).toEqual({
      search: 'Stadtwerke',
      connectionTypeId: 25,
      operatorId: 5,
      statusTypeId: 50,
      minPowerKw: 22
    })
  })
})
