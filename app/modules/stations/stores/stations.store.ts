import type { Station, StationsPage } from '#shared/schemas/station'
import { stationRepository } from '~/modules/stations/repository'
import type { StationFilters, StationsTableOptions } from '~/modules/stations/types'

/**
 * Stato di *dominio*: le stazioni caricate e il totale che le riguarda, non
 * i filtri, la pagina o l'ordinamento correnti (quelli sono UI, vedi
 * `useStationsFiltersStore`). Parla solo con `stationRepository` — non
 * conosce query string, header o `$fetch`, quindi non sa niente di HTTP.
 */
export const useStationsStore = defineStore('stations', () => {
  const stations = ref<Station[]>([])
  const total = ref(0)

  async function list(filters: StationFilters, table: StationsTableOptions): Promise<StationsPage> {
    const page = await stationRepository.list(filters, table)
    stations.value = page.items
    total.value = page.total
    return page
  }

  function getById(id: number): Promise<Station | null> {
    return stationRepository.getById(id)
  }

  return { stations, total, list, getById }
})
