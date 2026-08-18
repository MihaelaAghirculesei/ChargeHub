import { ofetch } from 'ofetch'
import {
  ocmPoiListSchema,
  ocmReferenceDataSchema,
  type OcmPoi,
  type OcmReferenceData
} from '#shared/schemas/ocm'
import type { Connector, ReferenceData, ReferenceEntry, Station } from '#shared/schemas/station'

const OCM_BASE_URL = 'https://api.openchargemap.io/v3'

/**
 * Errore di dominio per qualunque fallimento nel parlare con OCM: le rotte
 * API lo mappano su un errore HTTP proprio (vedi server/api/stations/*),
 * senza mai propagare la risposta o lo stack grezzo di OCM al client.
 */
export class OcmClientError extends Error {
  constructor(
    message: string,
    public readonly code: 'timeout' | 'network' | 'upstream_error' | 'invalid_response',
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'OcmClientError'
  }
}

/**
 * GET verso OCM con timeout e retry a backoff esponenziale (300ms, 600ms,
 * 1200ms) solo su errori transitori (timeout, rete, 5xx, 429) — mai su 4xx,
 * dove ritentare non cambierebbe l'esito. Non chiama mai un endpoint di
 * scrittura: OCM è un database reale della community.
 */
async function ocmGet<T>(
  path: string,
  query: Record<string, string | number | undefined>
): Promise<T> {
  const apiKey = useRuntimeConfig().ocmApiKey
  let attempt = 0

  try {
    return await ofetch<T>(path, {
      baseURL: OCM_BASE_URL,
      method: 'GET',
      query: { output: 'json', ...query },
      headers: { 'X-API-Key': apiKey },
      timeout: 8000,
      retry: 2,
      retryStatusCodes: [408, 429, 500, 502, 503, 504],
      retryDelay: () => {
        attempt += 1
        return 300 * 2 ** (attempt - 1)
      }
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new OcmClientError('Timeout nella richiesta a Open Charge Map.', 'timeout', error)
    }
    if (isFetchError(error) && typeof error.statusCode === 'number') {
      throw new OcmClientError(
        `Open Charge Map ha risposto con stato ${error.statusCode}.`,
        'upstream_error',
        error
      )
    }
    throw new OcmClientError('Impossibile raggiungere Open Charge Map.', 'network', error)
  }
}

function isFetchError(error: unknown): error is { statusCode?: number } {
  return typeof error === 'object' && error !== null && 'statusCode' in error
}

export function normalizeConnector(raw: NonNullable<OcmPoi['Connections']>[number]): Connector {
  return {
    id: raw.ID,
    typeId: raw.ConnectionTypeID ?? null,
    type: raw.ConnectionType?.Title ?? 'Sconosciuto',
    level: raw.Level?.Title ?? null,
    powerKw: raw.PowerKW ?? null,
    quantity: raw.Quantity ?? 1
  }
}

export function normalizeStation(raw: OcmPoi): Station {
  const connectors = (raw.Connections ?? []).map(normalizeConnector)
  const powerValues = connectors
    .map((connector) => connector.powerKw)
    .filter((power) => power !== null)

  return {
    id: raw.ID,
    uuid: raw.UUID,
    name: raw.AddressInfo.Title ?? 'Stazione senza nome',
    operator: raw.OperatorInfo?.Title ?? 'Operatore sconosciuto',
    address: {
      line1: raw.AddressInfo.AddressLine1 ?? null,
      line2: raw.AddressInfo.AddressLine2 ?? null,
      town: raw.AddressInfo.Town ?? null,
      postcode: raw.AddressInfo.Postcode ?? null,
      country: raw.AddressInfo.Country?.Title ?? null
    },
    latitude: raw.AddressInfo.Latitude,
    longitude: raw.AddressInfo.Longitude,
    connectors,
    maxPowerKw: powerValues.length > 0 ? Math.max(...powerValues) : null,
    numberOfPoints: raw.NumberOfPoints ?? connectors.length,
    operationalStatus: raw.StatusType?.Title ?? 'Sconosciuto',
    isOperational: raw.StatusType?.IsOperational ?? null,
    lastVerified: raw.DateLastVerified ?? null
  }
}

function normalizeReferenceEntry(raw: { ID: number; Title?: string | null }): ReferenceEntry {
  return { id: raw.ID, title: raw.Title ?? 'Sconosciuto' }
}

export function normalizeReferenceData(raw: OcmReferenceData): ReferenceData {
  return {
    connectionTypes: raw.ConnectionTypes.map(normalizeReferenceEntry),
    operators: raw.Operators.map(normalizeReferenceEntry),
    statusTypes: raw.StatusTypes.map((entry) => ({
      ...normalizeReferenceEntry(entry),
      isOperational: entry.IsOperational ?? null
    }))
  }
}

export interface StationsFilters {
  latitude: number
  longitude: number
  radiusKm: number
  countryCode: string
  maxResults: number
  connectionTypeId?: number
  operatorId?: number
  statusTypeId?: number
  minPowerKw?: number
}

async function fetchStationsUncached(filters: StationsFilters): Promise<Station[]> {
  const raw = await ocmGet<unknown>('/poi/', {
    countrycode: filters.countryCode,
    latitude: filters.latitude,
    longitude: filters.longitude,
    distance: filters.radiusKm,
    distanceunit: 'KM',
    maxresults: filters.maxResults,
    connectiontypeid: filters.connectionTypeId,
    operatorid: filters.operatorId,
    statustypeid: filters.statusTypeId,
    minpowerkw: filters.minPowerKw
  })

  const parsed = ocmPoiListSchema.safeParse(raw)
  if (!parsed.success) {
    throw new OcmClientError(
      'Risposta di Open Charge Map in un formato inatteso.',
      'invalid_response',
      parsed.error
    )
  }

  return parsed.data.map(normalizeStation)
}

async function fetchStationByIdUncached(id: number): Promise<Station | null> {
  const raw = await ocmGet<unknown>('/poi/', { chargepointid: id })

  const parsed = ocmPoiListSchema.safeParse(raw)
  if (!parsed.success) {
    throw new OcmClientError(
      'Risposta di Open Charge Map in un formato inatteso.',
      'invalid_response',
      parsed.error
    )
  }

  const [station] = parsed.data
  return station ? normalizeStation(station) : null
}

async function fetchReferenceDataUncached(countryCode: string): Promise<ReferenceData> {
  const raw = await ocmGet<unknown>('/referencedata/', { countrycode: countryCode })

  const parsed = ocmReferenceDataSchema.safeParse(raw)
  if (!parsed.success) {
    throw new OcmClientError(
      'Risposta di Open Charge Map in un formato inatteso.',
      'invalid_response',
      parsed.error
    )
  }

  return normalizeReferenceData(parsed.data)
}

const CACHE_TTL_SECONDS = 60 * 60 * 24

/**
 * Chiave di cache filesystem-safe: `unstorage` la usa come nome file (driver
 * fs), quindi niente `:`/`{}` come produrrebbe `JSON.stringify` — non validi
 * in un path su Windows.
 */
function stationsFiltersCacheKey(filters: StationsFilters): string {
  return [
    filters.latitude,
    filters.longitude,
    filters.radiusKm,
    filters.countryCode,
    filters.maxResults,
    filters.connectionTypeId ?? '',
    filters.operatorId ?? '',
    filters.statusTypeId ?? '',
    filters.minPowerKw ?? ''
  ].join('_')
}

/** Registro stazioni: TTL 24h, come da regola d'oro dell'API OCM. */
export const fetchStations = defineCachedFunction(fetchStationsUncached, {
  maxAge: CACHE_TTL_SECONDS,
  name: 'ocm-stations',
  getKey: stationsFiltersCacheKey
})

export const fetchStationById = defineCachedFunction(fetchStationByIdUncached, {
  maxAge: CACHE_TTL_SECONDS,
  name: 'ocm-station-by-id',
  getKey: (id: number) => String(id)
})

/** Tabelle di lookup: cambiano raramente, TTL 24h. */
export const fetchReferenceData = defineCachedFunction(fetchReferenceDataUncached, {
  maxAge: CACHE_TTL_SECONDS,
  name: 'ocm-reference-data',
  getKey: (countryCode: string) => countryCode
})
