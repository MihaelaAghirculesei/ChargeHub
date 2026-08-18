import { FetchError } from 'ofetch'
import type { ReferenceData, Station, StationsPage } from '#shared/schemas/station'
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
 * Unico punto del codice client che sa che le stazioni vivono dietro
 * `/api/stations`: store e composable parlano solo di `StationFilters`/
 * `StationsTableOptions`/`Station`, mai di query string o di `$fetch`.
 * Cambiare rotta o forma della richiesta tocca solo questo file.
 */
export const stationRepository = {
  list(filters: StationFilters, table: StationsTableOptions): Promise<StationsPage> {
    return $fetch<StationsPage>('/api/stations', { query: toQuery(filters, table) })
  },

  /**
   * `null` per "non trovata" (stesso contratto di `fetchStationById` lato
   * server), non un'eccezione: al chiamante non deve importare che sotto sia
   * successo un 404 HTTP. Qualunque altro errore (rete, 502 da OCM) risale.
   */
  async getById(id: number): Promise<Station | null> {
    try {
      return await $fetch<Station>(`/api/stations/${id}`)
    } catch (error) {
      if (error instanceof FetchError && error.statusCode === 404) return null
      throw error
    }
  },

  /** Tabelle di lookup (tipi di connettore, operatori, stati) per i dropdown della barra filtri. */
  referenceData(countryCode: string): Promise<ReferenceData> {
    return $fetch<ReferenceData>('/api/reference-data', { query: { countrycode: countryCode } })
  }
}
