import { z } from 'zod'
import { OcmClientError, fetchStations } from '~~/server/services/ocm-client'

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(100).default(25),
  countrycode: z.string().length(2).default('DE'),
  maxresults: z.coerce.number().int().positive().max(100).default(50),
  connectiontypeid: z.coerce.number().int().positive().optional(),
  operatorid: z.coerce.number().int().positive().optional(),
  statustypeid: z.coerce.number().int().positive().optional(),
  minpowerkw: z.coerce.number().positive().optional()
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
    minpowerkw
  } = parsedQuery.data

  try {
    return await fetchStations({
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
