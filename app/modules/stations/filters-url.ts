import type { StationFilters } from '~/modules/stations/types'

/**
 * Traduzione tra i filtri condivisibili (barra filtri del Giorno 6 + area di
 * ricerca della mappa del Giorno 8) e i query param dell'URL, così una
 * ricerca è condivisibile via link e sopravvive al refresh — separata da
 * `stationRepository`/`toQuery()` perché questa è la forma per *l'indirizzo
 * del browser*, non per la richiesta a `/api/stations` (nomi uguali per
 * semplicità, ma sono due contratti diversi: uno guarda l'URL, l'altro l'API).
 */
type RouteQueryValue = string | (string | null)[] | null | undefined
type RouteQuery = Record<string, RouteQueryValue>

function firstValue(value: RouteQueryValue): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return raw ?? undefined
}

function parsePositiveInt(value: RouteQueryValue): number | undefined {
  const raw = firstValue(value)
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function parsePositiveNumber(value: RouteQueryValue): number | undefined {
  const raw = firstValue(value)
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** Lat/lon possono essere negativi o 0 (equatore/meridiano di Greenwich): niente `positive`. */
function parseBoundedNumber(value: RouteQueryValue, min: number, max: number): number | undefined {
  const raw = firstValue(value)
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined
}

/** `undefined` per ogni campo assente dall'URL: il chiamante decide i default. */
export function parseFiltersFromQuery(query: RouteQuery): Partial<StationFilters> {
  const search = firstValue(query.search)
  return {
    latitude: parseBoundedNumber(query.lat, -90, 90),
    longitude: parseBoundedNumber(query.lon, -180, 180),
    radiusKm: parsePositiveNumber(query.radius),
    search: search || undefined,
    connectionTypeId: parsePositiveInt(query.connectiontypeid),
    operatorId: parsePositiveInt(query.operatorid),
    statusTypeId: parsePositiveInt(query.statustypeid),
    minPowerKw: parsePositiveNumber(query.minpowerkw)
  }
}

/**
 * `undefined` invece di omettere la chiave: Vue Router rimuove dall'URL i
 * param con valore `undefined`/`null`, quindi resettare un filtro passa da
 * qui, non da un `delete` a mano.
 */
export function filtersToQuery(filters: StationFilters): RouteQuery {
  return {
    lat: String(filters.latitude),
    lon: String(filters.longitude),
    radius: String(filters.radiusKm),
    search: filters.search || undefined,
    connectiontypeid: filters.connectionTypeId ? String(filters.connectionTypeId) : undefined,
    operatorid: filters.operatorId ? String(filters.operatorId) : undefined,
    statustypeid: filters.statusTypeId ? String(filters.statusTypeId) : undefined,
    minpowerkw: filters.minPowerKw ? String(filters.minPowerKw) : undefined
  }
}
