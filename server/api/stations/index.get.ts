import { z } from 'zod'
import type { Station, StationSortKey } from '#shared/schemas/station'
import { OcmClientError, fetchStations } from '~~/server/services/ocm-client'

/**
 * Per-column accessors: keep `paginate()` generic
 * (server/utils/paginate.ts) without making it know the shape of `Station`.
 */
const sortAccessors: Record<StationSortKey, (station: Station) => string | number | null> = {
  name: (station) => station.name,
  operator: (station) => station.operator,
  town: (station) => station.address.town,
  maxPowerKw: (station) => station.maxPowerKw,
  operationalStatus: (station) => station.operationalStatus
}

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(100).default(25),
  countrycode: z.string().length(2).default('DE'),
  // How many results to ask OCM for (the API's real cap: 100), not how many
  // to show per page — see itemsperpage for that. A single fetch (24h of
  // cache) covers all pages.
  maxresults: z.coerce.number().int().positive().max(100).default(100),
  connectiontypeid: z.coerce.number().int().positive().optional(),
  operatorid: z.coerce.number().int().positive().optional(),
  statustypeid: z.coerce.number().int().positive().optional(),
  minpowerkw: z.coerce.number().positive().optional(),
  // Our filter, not OCM's: does not touch the fetch/cache to OCM, applied
  // afterwards on the already-cached result — see outside the schema.
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  itemsperpage: z.coerce.number().int().positive().max(100).default(10),
  sortby: z.enum(['name', 'operator', 'town', 'maxPowerKw', 'operationalStatus']).optional(),
  sortorder: z.enum(['asc', 'desc']).default('asc')
})

export default defineEventHandler(async (event) => {
  const parsedQuery = await getValidatedQuery(event, (query) => querySchema.safeParse(query))

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid search parameters.',
      data: { issues: parsedQuery.error.issues.map((issue) => issue.message) }
    })
  }

  const {
    lat,
    lon,
    radius,
    countrycode,
    maxresults,
    connectiontypeid,
    operatorid,
    statustypeid,
    minpowerkw,
    search,
    page,
    itemsperpage,
    sortby,
    sortorder
  } = parsedQuery.data

  try {
    const stations = await fetchStations({
      latitude: lat,
      longitude: lon,
      radiusKm: radius,
      countryCode: countrycode,
      maxResults: maxresults,
      connectionTypeId: connectiontypeid,
      operatorId: operatorid,
      statusTypeId: statustypeid,
      minPowerKw: minpowerkw
    })

    const filtered = search
      ? stations.filter((station) =>
          matchesText([station.name, station.operator, station.address.town], search)
        )
      : stations

    return paginate(
      filtered,
      { page, itemsPerPage: itemsperpage, sortBy: sortby, sortOrder: sortorder },
      sortby ? sortAccessors[sortby] : undefined
    )
  } catch (error) {
    if (error instanceof OcmClientError) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Could not fetch stations from the Open Charge Map registry.',
        data: { code: error.code }
      })
    }
    throw error
  }
})
