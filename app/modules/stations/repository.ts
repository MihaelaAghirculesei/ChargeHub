import { FetchError } from 'ofetch'
import type {
  ExtractedStationFilters,
  ReferenceData,
  Station,
  StationsPage
} from '#shared/schemas/station'
import type { StationFilters, StationsTableOptions } from '~/modules/stations/types'

interface StationsQuery {
  lat: number
  lon: number
  radius: number
  countrycode: string
  maxresults: number
  search?: string
  connectiontypeid?: number
  operatorid?: number
  statustypeid?: number
  minpowerkw?: number
  page: number
  itemsperpage: number
  sortby?: string
  sortorder?: 'asc' | 'desc'
}

function toQuery(filters: StationFilters, table: StationsTableOptions): StationsQuery {
  return {
    lat: filters.latitude,
    lon: filters.longitude,
    radius: filters.radiusKm,
    countrycode: filters.countryCode,
    maxresults: filters.maxResults,
    search: filters.search,
    connectiontypeid: filters.connectionTypeId,
    operatorid: filters.operatorId,
    statustypeid: filters.statusTypeId,
    minpowerkw: filters.minPowerKw,
    page: table.page,
    itemsperpage: table.itemsPerPage,
    sortby: table.sortBy,
    sortorder: table.sortOrder
  }
}

/**
 * The only place in the client code that knows stations live behind
 * `/api/stations`: store and composable speak only of `StationFilters`/
 * `StationsTableOptions`/`Station`, never of a query string or `$fetch`.
 * Changing the route or the request shape touches only this file.
 */
export const stationRepository = {
  list(filters: StationFilters, table: StationsTableOptions): Promise<StationsPage> {
    return $fetch<StationsPage>('/api/stations', { query: toQuery(filters, table) })
  },

  /**
   * `null` for "not found" (same contract as `fetchStationById` on the
   * server), not an exception: the caller should not care that a 404 HTTP
   * happened underneath. Any other error (network, 502 from OCM) propagates.
   */
  async getById(id: number): Promise<Station | null> {
    try {
      return await $fetch<Station>(`/api/stations/${id}`)
    } catch (error) {
      if (error instanceof FetchError && error.statusCode === 404) return null
      throw error
    }
  },

  /** Lookup tables (connector types, operators, statuses) for the filter bar dropdowns. */
  referenceData(countryCode: string): Promise<ReferenceData> {
    return $fetch<ReferenceData>('/api/reference-data', { query: { countrycode: countryCode } })
  },

  /** Natural-language station search (ADR-0007): extracts filters, not stations — the caller applies them to the existing store. */
  nlSearch(query: string, countryCode: string): Promise<{ filters: ExtractedStationFilters }> {
    return $fetch<{ filters: ExtractedStationFilters }>('/api/stations/nl-search', {
      method: 'POST',
      body: { query, countrycode: countryCode }
    })
  }
}
