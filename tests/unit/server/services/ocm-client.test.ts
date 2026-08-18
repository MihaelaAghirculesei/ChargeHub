import { describe, expect, it, vi } from 'vitest'
import type { OcmPoi, OcmReferenceData } from '#shared/schemas/ocm'

const { ofetchMock } = vi.hoisted(() => ({ ofetchMock: vi.fn() }))
vi.mock('ofetch', () => ({ ofetch: ofetchMock }))

// `defineCachedFunction` è un auto-import di Nitro (server), non disponibile
// nell'ambiente vitest "nuxt" (pensato per composable/componenti lato app).
// Lo stubbiamo come pass-through: qui testiamo la logica di normalizzazione
// ed errori, non il decorator di cache di Nitro (già testato a monte).
vi.stubGlobal('defineCachedFunction', (fn: (...args: never[]) => unknown) => fn)

const { fetchStations, fetchStationById, fetchReferenceData, normalizeConnector, normalizeStation, normalizeReferenceData, OcmClientError } =
  await import('~~/server/services/ocm-client')

function makePoi(overrides: Partial<OcmPoi> = {}): OcmPoi {
  return {
    ID: 1,
    UUID: 'uuid-1',
    AddressInfo: {
      Title: 'Stazione test',
      AddressLine1: 'Via Roma 1',
      AddressLine2: null,
      Town: 'Milano',
      StateOrProvince: null,
      Postcode: '20100',
      Country: { ISOCode: 'IT', Title: 'Italy' },
      Latitude: 45.46,
      Longitude: 9.19
    },
    OperatorInfo: { ID: 10, Title: 'Enel X' },
    StatusType: { ID: 50, Title: 'Operational', IsOperational: true },
    Connections: [],
    NumberOfPoints: 1,
    DateLastVerified: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

describe('normalizeConnector', () => {
  it('applica i default quando i campi opzionali mancano', () => {
    const connector = normalizeConnector({
      ID: 1,
      ConnectionTypeID: null,
      ConnectionType: null,
      StatusTypeID: null,
      Level: null,
      PowerKW: null,
      Quantity: null
    })

    expect(connector).toEqual({
      id: 1,
      typeId: null,
      type: 'Sconosciuto',
      level: null,
      powerKw: null,
      quantity: 1
    })
  })

  it('passa attraverso i valori quando presenti', () => {
    const connector = normalizeConnector({
      ID: 2,
      ConnectionTypeID: 25,
      ConnectionType: { ID: 25, Title: 'Type 2' },
      StatusTypeID: null,
      Level: { ID: 3, Title: 'Level 2' },
      PowerKW: 22,
      Quantity: 4
    })

    expect(connector).toEqual({
      id: 2,
      typeId: 25,
      type: 'Type 2',
      level: 'Level 2',
      powerKw: 22,
      quantity: 4
    })
  })
})

describe('normalizeStation', () => {
  it('applica i default quando nome, operatore e stato mancano', () => {
    const station = normalizeStation(
      makePoi({ AddressInfo: { ...makePoi().AddressInfo, Title: null }, OperatorInfo: null, StatusType: null })
    )

    expect(station.name).toBe('Stazione senza nome')
    expect(station.operator).toBe('Operatore sconosciuto')
    expect(station.operationalStatus).toBe('Sconosciuto')
    expect(station.isOperational).toBeNull()
  })

  it('calcola maxPowerKw come il massimo tra i connettori con potenza nota', () => {
    const station = normalizeStation(
      makePoi({
        Connections: [
          { ID: 1, ConnectionTypeID: null, ConnectionType: null, StatusTypeID: null, Level: null, PowerKW: 11, Quantity: 1 },
          { ID: 2, ConnectionTypeID: null, ConnectionType: null, StatusTypeID: null, Level: null, PowerKW: 50, Quantity: 1 },
          { ID: 3, ConnectionTypeID: null, ConnectionType: null, StatusTypeID: null, Level: null, PowerKW: null, Quantity: 1 }
        ]
      })
    )

    expect(station.maxPowerKw).toBe(50)
    expect(station.numberOfPoints).toBe(1)
  })

  it('restituisce maxPowerKw null quando nessun connettore ha una potenza nota', () => {
    const station = normalizeStation(makePoi({ Connections: [] }))

    expect(station.maxPowerKw).toBeNull()
  })

  it('usa il numero di connettori quando NumberOfPoints manca', () => {
    const station = normalizeStation(
      makePoi({
        NumberOfPoints: null,
        Connections: [
          { ID: 1, ConnectionTypeID: null, ConnectionType: null, StatusTypeID: null, Level: null, PowerKW: null, Quantity: 1 },
          { ID: 2, ConnectionTypeID: null, ConnectionType: null, StatusTypeID: null, Level: null, PowerKW: null, Quantity: 1 }
        ]
      })
    )

    expect(station.numberOfPoints).toBe(2)
  })
})

describe('normalizeReferenceData', () => {
  it('applica il default "Sconosciuto" e passa attraverso isOperational', () => {
    const raw: OcmReferenceData = {
      ConnectionTypes: [{ ID: 1, Title: null }],
      Operators: [{ ID: 2, Title: 'Enel X' }],
      StatusTypes: [
        { ID: 3, Title: 'Operational', IsOperational: true },
        { ID: 4, Title: null, IsOperational: null }
      ]
    }

    expect(normalizeReferenceData(raw)).toEqual({
      connectionTypes: [{ id: 1, title: 'Sconosciuto' }],
      operators: [{ id: 2, title: 'Enel X' }],
      statusTypes: [
        { id: 3, title: 'Operational', isOperational: true },
        { id: 4, title: 'Sconosciuto', isOperational: null }
      ]
    })
  })
})

describe('fetchStations', () => {
  it('restituisce le stazioni normalizzate su risposta valida', async () => {
    ofetchMock.mockResolvedValueOnce([makePoi({ ID: 101 })])

    const stations = await fetchStations({
      latitude: 45.46,
      longitude: 9.19,
      radiusKm: 10,
      countryCode: 'IT',
      maxResults: 10
    })

    expect(stations).toHaveLength(1)
    expect(stations[0]?.id).toBe(101)
  })

  it('lancia OcmClientError con code invalid_response su una risposta malformata', async () => {
    ofetchMock.mockResolvedValueOnce([{ not: 'a station' }])

    await expect(
      fetchStations({ latitude: 1, longitude: 2, radiusKm: 5, countryCode: 'DE', maxResults: 5 })
    ).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('mappa un errore con statusCode su upstream_error', async () => {
    ofetchMock.mockRejectedValueOnce(Object.assign(new Error('bad gateway'), { statusCode: 502 }))

    await expect(
      fetchStations({ latitude: 3, longitude: 4, radiusKm: 5, countryCode: 'FR', maxResults: 5 })
    ).rejects.toMatchObject({ code: 'upstream_error' })
  })

  it('mappa un TimeoutError su timeout', async () => {
    const timeoutError = new Error('timed out')
    timeoutError.name = 'TimeoutError'
    ofetchMock.mockRejectedValueOnce(timeoutError)

    await expect(
      fetchStations({ latitude: 5, longitude: 6, radiusKm: 5, countryCode: 'ES', maxResults: 5 })
    ).rejects.toMatchObject({ code: 'timeout' })
  })

  it('mappa un errore generico su network', async () => {
    ofetchMock.mockRejectedValueOnce(new Error('ECONNRESET'))

    await expect(
      fetchStations({ latitude: 7, longitude: 8, radiusKm: 5, countryCode: 'PT', maxResults: 5 })
    ).rejects.toMatchObject({ code: 'network' })
  })

  it('OcmClientError è un\'istanza di Error con name proprio', async () => {
    ofetchMock.mockRejectedValueOnce(new Error('ECONNRESET'))

    try {
      await fetchStations({ latitude: 9, longitude: 10, radiusKm: 5, countryCode: 'NL', maxResults: 5 })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(OcmClientError)
      expect(error).toBeInstanceOf(Error)
      expect((error as InstanceType<typeof OcmClientError>).name).toBe('OcmClientError')
    }
  })
})

describe('fetchStationById', () => {
  it('restituisce null quando OCM non trova nessuna stazione con quel id', async () => {
    ofetchMock.mockResolvedValueOnce([])

    const station = await fetchStationById(999901)

    expect(station).toBeNull()
  })

  it('restituisce la stazione normalizzata quando trovata', async () => {
    ofetchMock.mockResolvedValueOnce([makePoi({ ID: 999902 })])

    const station = await fetchStationById(999902)

    expect(station?.id).toBe(999902)
  })
})

describe('fetchReferenceData', () => {
  it('restituisce le tabelle di riferimento normalizzate', async () => {
    ofetchMock.mockResolvedValueOnce({
      ConnectionTypes: [{ ID: 1, Title: 'CCS' }],
      Operators: [{ ID: 2, Title: 'Enel X' }],
      StatusTypes: [{ ID: 3, Title: 'Operational', IsOperational: true }]
    })

    const referenceData = await fetchReferenceData('AT')

    expect(referenceData.connectionTypes).toEqual([{ id: 1, title: 'CCS' }])
  })

  it('lancia OcmClientError con code invalid_response su una risposta malformata', async () => {
    ofetchMock.mockResolvedValueOnce({ not: 'reference data' })

    await expect(fetchReferenceData('BE')).rejects.toMatchObject({ code: 'invalid_response' })
  })
})
