import type { Station } from '#shared/schemas/station'
import { stationRepository } from '~/modules/stations/repository'
import type { StationFilters } from '~/modules/stations/types'

/**
 * Stato di *dominio*: le stazioni caricate, non i filtri o la selezione
 * dell'utente (quelli sono UI, vedi `useStationsFiltersStore`). Parla solo
 * con `stationRepository` — non conosce query string, header o `$fetch`,
 * quindi non sa niente di HTTP.
 */
export const useStationsStore = defineStore('stations', () => {
  const stations = ref<Station[]>([])

  async function list(filters: StationFilters): Promise<Station[]> {
    stations.value = await stationRepository.list(filters)
    return stations.value
  }

  function getById(id: number): Promise<Station | null> {
    return stationRepository.getById(id)
  }

  return { stations, list, getById }
})
