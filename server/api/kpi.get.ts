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
 * Dashboard KPIs for the pool of stations in the given area (same
 * geographic params as `GET /api/stations` / `GET /api/sessions`).
 * Generates the sessions with the same defaults as `GET /api/sessions` (not
 * an ad-hoc narrowed lookback): the same synthetic "reality" seen by the
 * Sitzungen page, only aggregated here over the last 7 days.
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
        statusMessage: 'Could not fetch stations from the Open Charge Map registry.',
        data: { code: error.code }
      })
    }
    throw error
  }
})
