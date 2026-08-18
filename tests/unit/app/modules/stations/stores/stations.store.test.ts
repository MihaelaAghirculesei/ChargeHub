import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Station } from '#shared/schemas/station'
import type { StationFilters } from '~/modules/stations/types'

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
  maxResults: 50
}

beforeEach(() => {
  setActivePinia(createPinia())
  listMock.mockReset()
  getByIdMock.mockReset()
})

describe('useStationsStore', () => {
  it('list delega al repository e mantiene lo stato in sync', async () => {
    const stations = [{ id: 1 }, { id: 2 }] as Station[]
    listMock.mockResolvedValueOnce(stations)

    const store = useStationsStore()
    const result = await store.list(filters)

    expect(listMock).toHaveBeenCalledWith(filters)
    expect(result).toEqual(stations)
    expect(store.stations).toEqual(stations)
  })

  it('getById delega al repository senza toccare lo stato della lista', async () => {
    const station = { id: 42 } as Station
    getByIdMock.mockResolvedValueOnce(station)

    const store = useStationsStore()
    const result = await store.getById(42)

    expect(getByIdMock).toHaveBeenCalledWith(42)
    expect(result).toBe(station)
    expect(store.stations).toEqual([])
  })
})
