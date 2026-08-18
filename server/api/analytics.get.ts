import { z } from 'zod'
import { computeAnalytics } from '~~/server/services/analytics-aggregator'
import { OcmClientError, fetchStations } from '~~/server/services/ocm-client'
import { generateSessions } from '~~/server/services/session-simulator'

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(100).default(25),
  countrycode: z.string().length(2).default('DE'),
  maxresults: z.coerce.number().int().positive().max(100).default(100),
  period: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .default(30)
})

/**
 * Dati per i grafici della dashboard (Giorno 14): stessi parametri
 * geografici di `GET /api/stations`/`GET /api/sessions`/`GET /api/kpi`
 * (stesso pool, stessa "realtà" sintetica), più `period` (7/30/90 giorni).
 * Genera le sessioni con gli stessi default di `GET /api/sessions` — non un
 * lookback ristretto al periodo richiesto, vedi la nota in
 * `analytics-aggregator.ts` sul perché periodi oltre 30 giorni mostrano
 * onestamente delle giornate a zero kWh.
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

  const { lat, lon, radius, countrycode, maxresults, period } = parsedQuery.data

  try {
    const stations = await fetchStations({
      latitude: lat,
      longitude: lon,
      radiusKm: radius,
      countryCode: countrycode,
      maxResults: maxresults
    })

    const sessions = generateSessions(stations)

    return computeAnalytics(stations, sessions, period)
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
