import { z } from 'zod'
import { computeKpis } from '~~/server/services/kpi-aggregator'
import { OcmClientError, fetchStations } from '~~/server/services/ocm-client'
import { generateSessions } from '~~/server/services/session-simulator'

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(100).default(25),
  countrycode: z.string().length(2).default('DE'),
  maxresults: z.coerce.number().int().positive().max(100).default(100)
})

/**
 * KPI della dashboard per il pool di stazioni nell'area indicata (stessi
 * parametri geografici di `GET /api/stations`/`GET /api/sessions`). Genera
 * le sessioni con gli stessi default di `GET /api/sessions` (non un
 * lookback ristretto ad hoc): stessa "realtà" sintetica vista dalla pagina
 * Sitzungen, qui solo aggregata sugli ultimi 7 giorni.
 */
export default defineEventHandler(async (event) => {
  const parsedQuery = await getValidatedQuery(event, (query) => querySchema.safeParse(query))

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parametri di ricerca non validi.',
      data: { issues: parsedQuery.error.issues.map((issue) => issue.message) }
    })
  }

  const { lat, lon, radius, countrycode, maxresults } = parsedQuery.data

  try {
    const stations = await fetchStations({
      latitude: lat,
      longitude: lon,
      radiusKm: radius,
      countryCode: countrycode,
      maxResults: maxresults
    })

    const sessions = generateSessions(stations)

    return computeKpis(stations, sessions)
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
