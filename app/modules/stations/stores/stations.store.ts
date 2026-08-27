import type { Station, StationsPage } from '#shared/schemas/station'
import { stationRepository } from '~/modules/stations/repository'
import type { StationFilters, StationsTableOptions } from '~/modules/stations/types'

/**
 * *Domain* state: the loaded stations and the total that concerns them, not
 * the current filters, page or sort (those are UI, see
 * `useStationsFiltersStore`). Talks only to `stationRepository` — knows no
 * query string, header or `$fetch`, so knows nothing about HTTP.
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
