import { z } from 'zod'
import type { Station, StationSortKey } from '#shared/schemas/station'
import { OcmClientError, fetchStations } from '~~/server/services/ocm-client'

/**
 * Accessor per colonna: tengono `paginate()` generico (server/utils/paginate.ts)
 * senza fargli conoscere la forma di `Station`.
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
  // Quanti risultati chiedere a OCM (tetto reale dell'API: 100), non quanti
  // mostrarne per pagina — vedi itemsperpage per quello. Un solo fetch (24h
  // di cache) copre tutte le pagine.
  maxresults: z.coerce.number().int().positive().max(100).default(100),
  connectiontypeid: z.coerce.number().int().positive().optional(),
  operatorid: z.coerce.number().int().positive().optional(),
  statustypeid: z.coerce.number().int().positive().optional(),
  minpowerkw: z.coerce.number().positive().optional(),
  // Filtro nostro, non di OCM: non tocca il fetch/la cache verso OCM, si
  // applica dopo, sul risultato già cachato — vedi fuori dallo schema.
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
      statusMessage: 'Parametri di ricerca non validi.',
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
        statusMessage: 'Impossibile recuperare le stazioni dal registro Open Charge Map.',
        data: { code: error.code }
      })
    }
    throw error
  }
})
