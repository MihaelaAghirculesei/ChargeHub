import { z } from 'zod'
import { OcmClientError, fetchStationById } from '~~/server/services/ocm-client'
import { computeStationTelemetry } from '~~/server/services/telemetry-simulator'

/** Batch ragionevole per una singola richiesta: niente scan illimitate. */
const MAX_STATION_IDS = 20

const querySchema = z.object({
  stationId: z
    .string()
    .transform((value) => value.split(',').map((part) => Number(part.trim())))
    .pipe(z.array(z.number().int().positive()).min(1).max(MAX_STATION_IDS))
})

/**
 * Snapshot di telemetria simulata per una o più stazioni (`?stationId=1,2`).
 * Le specifiche dei connettori (potenza massima) vengono da OCM tramite la
 * stessa cache di `GET /api/stations/:id`; lo stato dinamico è calcolato al
 * volo da `computeStationTelemetry`, vedi docs/adr/0002-telemetry-simulation.md.
 */
export default defineEventHandler(async (event) => {
  const parsedQuery = await getValidatedQuery(event, (query) => querySchema.safeParse(query))

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parametro stationId non valido: usare un ID o una lista separata da virgole.'
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
        statusMessage: 'Impossibile recuperare le stazioni dal registro Open Charge Map.',
        data: { code: error.code }
      })
    }
    throw error
  }
})
