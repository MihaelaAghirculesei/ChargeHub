import { z } from 'zod'
import { OcmClientError, fetchStationById } from '~~/server/services/ocm-client'
import { computeStationTelemetry } from '~~/server/services/telemetry-simulator'

/** A reasonable batch for a single request: no unbounded scans. */
const MAX_STATION_IDS = 20

const querySchema = z.object({
  stationId: z
    .string()
    .transform((value) => value.split(',').map((part) => Number(part.trim())))
    .pipe(z.array(z.number().int().positive()).min(1).max(MAX_STATION_IDS))
})

/**
 * Snapshot of simulated telemetry for one or more stations
 * (`?stationId=1,2`). The connector specs (max power) come from OCM via the
 * same cache as `GET /api/stations/:id`; the dynamic state is computed on
 * the fly by `computeStationTelemetry`, see
 * docs/adr/0002-telemetry-simulation.md.
 */
export default defineEventHandler(async (event) => {
  const parsedQuery = await getValidatedQuery(event, (query) => querySchema.safeParse(query))

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid stationId parameter: use an ID or a comma-separated list.'
    })
  }

  try {
    const stations = await Promise.all(parsedQuery.data.stationId.map((id) => fetchStationById(id)))

    const now = new Date()
    return stations
      .filter((station): station is NonNullable<typeof station> => station !== null)
      .map((station) => computeStationTelemetry(station, now))
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
