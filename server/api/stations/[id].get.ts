import { z } from 'zod'
import { OcmClientError, fetchStationById } from '~~/server/services/ocm-client'

const paramsSchema = z.object({
  id: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const parsedParams = await getValidatedRouterParams(event, (params) => paramsSchema.safeParse(params))

  if (!parsedParams.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID stazione non valido.'
    })
  }

  try {
    const station = await fetchStationById(parsedParams.data.id)

    if (!station) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Stazione non trovata.'
      })
    }

    return station
  } catch (error) {
    if (error instanceof OcmClientError) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Impossibile recuperare la stazione dal registro Open Charge Map.',
        data: { code: error.code }
      })
    }
    throw error
  }
})
