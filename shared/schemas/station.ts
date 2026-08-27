import { z } from 'zod'

/**
 * Tipi di dominio ChargeHub, normalizzati dalla forma grezza di OCM
 * (shared/schemas/ocm.ts). Sono quelli che il frontend vede davvero.
 *
 * `operationalStatus` riflette lo stato del registro OCM (impianto
 * pianificato/operativo/rimosso), non lo stato live del punto di ricarica:
 * quest'ultimo arriva dal simulatore di telemetria (Giorno 10) ed è un
 * concetto separato, per non confondere "esiste ed è in funzione secondo il
 * registro" con "sta caricando in questo momento".
 */

export const connectorSchema = z.object({
  id: z.number(),
  typeId: z.number().nullable(),
  type: z.string(),
  level: z.string().nullable(),
  powerKw: z.number().nullable(),
  quantity: z.number()
})

export const stationAddressSchema = z.object({
  line1: z.string().nullable(),
  line2: z.string().nullable(),
  town: z.string().nullable(),
  postcode: z.string().nullable(),
  country: z.string().nullable(),
  /** Note libere di chi ha censito la stazione — vedi shared/schemas/ocm.ts. */
  accessComments: z.string().nullable()
})

export const stationSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  name: z.string(),
  operator: z.string(),
  address: stationAddressSchema,
  latitude: z.number(),
  longitude: z.number(),
  connectors: z.array(connectorSchema),
  maxPowerKw: z.number().nullable(),
  numberOfPoints: z.number(),
  operationalStatus: z.string(),
  isOperational: z.boolean().nullable(),
  lastVerified: z.string().nullable(),
  /** "Public"/"Public - Membership Required"/... — vedi shared/schemas/ocm.ts. */
  usageType: z.string().nullable()
})

export const stationListSchema = z.array(stationSchema)

export const referenceEntrySchema = z.object({
  id: z.number(),
  title: z.string()
})

export const referenceDataSchema = z.object({
  connectionTypes: z.array(referenceEntrySchema),
  operators: z.array(referenceEntrySchema),
  statusTypes: z.array(
    referenceEntrySchema.extend({
      isOperational: z.boolean().nullable()
    })
  )
})

export type Connector = z.infer<typeof connectorSchema>
export type StationAddress = z.infer<typeof stationAddressSchema>
export type Station = z.infer<typeof stationSchema>
export type ReferenceEntry = z.infer<typeof referenceEntrySchema>
export type ReferenceData = z.infer<typeof referenceDataSchema>

/**
 * Colonne su cui `GET /api/stations` sa ordinare. OCM non pagina/ordina la
 * sua ricerca geografica: il BFF lo fa lui sopra il risultato già cachato
 * (vedi server/utils/paginate.ts), quindi l'elenco è vincolato ai campi che
 * quel livello sa leggere da `Station` — non è un contratto di OCM.
 */
export type StationSortKey = 'name' | 'operator' | 'town' | 'maxPowerKw' | 'operationalStatus'

/** Risposta paginata di `GET /api/stations`: non è dati OCM, non serve Zod. */
export interface StationsPage {
  items: Station[]
  total: number
}

/**
 * Filters extracted by `POST /api/stations/nl-search` (ADR-0007) — a subset
 * of `StationFilters` (app/modules/stations/types); position is deliberately
 * absent: the natural-language search adds criteria on top of the current
 * view, it does not move it. Shared client+server so server/services/
 * nl-search.ts and the client repository stay on the same shape without
 * duplicating it.
 */
export const extractedStationFiltersSchema = z.object({
  search: z.string().nullable(),
  connectionTypeId: z.number().nullable(),
  operatorId: z.number().nullable(),
  statusTypeId: z.number().nullable(),
  minPowerKw: z.number().nullable()
})

export type ExtractedStationFilters = z.infer<typeof extractedStationFiltersSchema>
