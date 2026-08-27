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
 * Data for the dashboard charts (day 14): same geographic params as
 * `GET /api/stations` / `GET /api/sessions` / `GET /api/kpi` (same pool,
 * same synthetic "reality"), plus `period` (7/30/90 days). Generates the
 * sessions with the same defaults as `GET /api/sessions` — not a lookback
 * narrowed to the requested period, see the note in
 * `analytics-aggregator.ts` on why periods beyond 30 days honestly show
 * some days at zero kWh.
 */
export default defineEventHandler(async (event) => {
  const parsedQuery = await getValidatedQuery(event, (query) => querySchema.safeParse(query))

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid search parameters.',
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
        statusMessage: 'Could not fetch stations from the Open Charge Map registry.',
        data: { code: error.code }
      })
    }
    throw error
  }
})
