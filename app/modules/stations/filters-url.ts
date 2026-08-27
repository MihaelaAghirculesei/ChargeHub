import type { StationFilters } from '~/modules/stations/types'

/**
 * Translation between the shareable filters (day-6 filter bar + day-8 map
 * search area) and the URL query params, so a search is shareable via link
 * and survives a refresh — separate from `stationRepository`/`toQuery()`
 * because this is the shape for *the browser's address*, not for the
 * request to `/api/stations` (same names for simplicity, but two different
 * contracts: one looks at the URL, the other at the API).
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

/** Lat/lon can be negative or 0 (equator/Greenwich meridian): no `positive`. */
function parseBoundedNumber(value: RouteQueryValue, min: number, max: number): number | undefined {
  const raw = firstValue(value)
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined
}

/** `undefined` for every field absent from the URL: the caller decides the defaults. */
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
 * `undefined` instead of omitting the key: Vue Router strips params with
 * value `undefined`/`null` from the URL, so resetting a filter goes through
 * here, not through a manual `delete`.
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
