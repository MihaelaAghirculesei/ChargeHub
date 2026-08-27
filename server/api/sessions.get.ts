import { z } from 'zod'
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
 * Synthetic session history for the pool of stations in the given area
 * (same geographic params as `GET /api/stations`, so it is "the sessions of
 * the stations you are already looking at"). No period/station filter here:
 * the client loads the whole set once (that is the point of the virtualised
 * table, day 12) and filters in memory — a round trip to the server for
 * every filter change would be redundant when the data is all there
 * already.
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

    return generateSessions(stations)
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
