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
 * Storico sintetico di sessioni per il pool di stazioni nell'area indicata
 * (stessi parametri geografici di `GET /api/stations`, così è "le sessioni
 * delle stazioni che stai già guardando"). Nessun filtro di periodo/stazione
 * qui: il client carica l'intero set una volta sola (è il punto della
 * tabella virtualizzata, Giorno 12) e filtra in memoria — un giro al
 * server per ogni cambio di filtro sarebbe superfluo quando i dati sono
 * già tutti lì.
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

    return generateSessions(stations)
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
