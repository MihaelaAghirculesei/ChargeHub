import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Station } from '#shared/schemas/station'
import type { StationFilters, StationsTableOptions } from '~/modules/stations/types'

const { listMock, getByIdMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  getByIdMock: vi.fn()
}))
vi.mock('~/modules/stations/repository', () => ({
  stationRepository: { list: listMock, getById: getByIdMock }
}))

const { useStationsStore } = await import('~/modules/stations/stores/stations.store')

const filters: StationFilters = {
  latitude: 52.42,
  longitude: 10.79,
  radiusKm: 25,
  countryCode: 'DE',
  maxResults: 100
}

const table: StationsTableOptions = { page: 1, itemsPerPage: 10 }

beforeEach(() => {
  setActivePinia(createPinia())
  listMock.mockReset()
  getByIdMock.mockReset()
})

describe('useStationsStore', () => {
  it('list delegates to the repository and keeps stations/total in sync', async () => {
    const stations = [{ id: 1 }, { id: 2 }] as Station[]
    listMock.mockResolvedValueOnce({ items: stations, total: 23 })

    const store = useStationsStore()
    const result = await store.list(filters, table)

    expect(listMock).toHaveBeenCalledWith(filters, table)
    expect(result).toEqual({ items: stations, total: 23 })
    expect(store.stations).toEqual(stations)
    expect(store.total).toBe(23)
  })

  it('getById delegates to the repository without touching the list state', async () => {
    const station = { id: 42 } as Station
    getByIdMock.mockResolvedValueOnce(station)

    const store = useStationsStore()
    const result = await store.getById(42)

    expect(getByIdMock).toHaveBeenCalledWith(42)
    expect(result).toBe(station)
    expect(store.stations).toEqual([])
    expect(store.total).toBe(0)
  })
})
