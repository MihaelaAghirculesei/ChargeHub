import { z } from 'zod'
import { OcmClientError, fetchReferenceData } from '~~/server/services/ocm-client'

const querySchema = z.object({
  countrycode: z.string().length(2).default('DE')
})

export default defineEventHandler(async (event) => {
  const parsedQuery = await getValidatedQuery(event, (query) => querySchema.safeParse(query))

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parametri non validi.'
    })
  }

  try {
    return await fetchReferenceData(parsedQuery.data.countrycode)
  } catch (error) {
    if (error instanceof OcmClientError) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Impossibile recuperare le tabelle di riferimento da Open Charge Map.',
        data: { code: error.code }
      })
    }
    throw error
  }
})
