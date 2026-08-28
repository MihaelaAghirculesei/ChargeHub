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
  it('reads every filter field present in the query, coordinates included', () => {
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

  it('returns undefined for absent, invalid or empty fields', () => {
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

  it('takes the first value when the same param appears more than once', () => {
    expect(parseFiltersFromQuery({ search: ['Rathaus', 'Stadtwerke'] })).toMatchObject({
      search: 'Rathaus'
    })
  })

  it('discards a non-positive or non-integer ID', () => {
    expect(parseFiltersFromQuery({ operatorid: '-5' }).operatorId).toBeUndefined()
    expect(parseFiltersFromQuery({ operatorid: '2.5' }).operatorId).toBeUndefined()
  })

  it('accepts negative or zero latitude/longitude, not only positive', () => {
    expect(parseFiltersFromQuery({ lat: '-33.87', lon: '0' })).toMatchObject({
      latitude: -33.87,
      longitude: 0
    })
  })

  it('discards coordinates outside the valid range', () => {
    expect(parseFiltersFromQuery({ lat: '95' }).latitude).toBeUndefined()
    expect(parseFiltersFromQuery({ lon: '-200' }).longitude).toBeUndefined()
  })
})

describe('filtersToQuery', () => {
  it('always serialises the coordinates and only the active optional filters', () => {
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

  it('round-trip: parse(serialize(filters)) returns the same filters', () => {
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
