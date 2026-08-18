import { FetchError } from 'ofetch'
import type { Station } from '#shared/schemas/station'
import type { StationFilters } from '~/modules/stations/types'

interface StationsQuery {
  lat: number
  lon: number
  radius: number
  countrycode: string
  maxresults: number
  connectiontypeid?: number
  operatorid?: number
  statustypeid?: number
  minpowerkw?: number
}

function toQuery(filters: StationFilters): StationsQuery {
  return {
    lat: filters.latitude,
    lon: filters.longitude,
    radius: filters.radiusKm,
    countrycode: filters.countryCode,
    maxresults: filters.maxResults,
    connectiontypeid: filters.connectionTypeId,
    operatorid: filters.operatorId,
    statustypeid: filters.statusTypeId,
    minpowerkw: filters.minPowerKw
  }
}

/**
 * Unico punto del codice client che sa che le stazioni vivono dietro
 * `/api/stations`: store e composable parlano solo di `StationFilters`/
 * `Station`, mai di query string o di `$fetch`. Cambiare rotta o forma della
 * richiesta tocca solo questo file.
 */
export const stationRepository = {
  list(filters: StationFilters): Promise<Station[]> {
    return $fetch<Station[]>('/api/stations', { query: toQuery(filters) })
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
  }
}
