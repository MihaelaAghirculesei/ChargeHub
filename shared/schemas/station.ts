import { z } from 'zod'

/**
 * ChargeHub domain types, normalised from OCM's raw shape
 * (shared/schemas/ocm.ts). These are what the frontend actually sees.
 *
 * `operationalStatus` reflects the OCM registry status (site
 * planned/operational/removed), not the live status of the charge point:
 * the latter comes from the telemetry simulator (day 10) and is a separate
 * concept, so as not to confuse "exists and is in service per the registry"
 * with "is charging right now".
 */

export const connectorSchema = z.object({
  id: z.number(),
  typeId: z.number().nullable(),
  // `null` when OCM omits it — the UI renders `t('common.unknown')`, the
  // server never hard-codes a language-locked label (see ocm-client.ts).
  type: z.string().nullable(),
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
  /** Free-form notes from whoever recorded the station — see shared/schemas/ocm.ts. */
  accessComments: z.string().nullable()
})

export const stationSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  // `name`/`operator`/`operationalStatus` are `null` when OCM omits them —
  // the UI renders `t('common.unknown')`, the server never hard-codes a
  // language-locked label (see ocm-client.ts, same as `usageType` below).
  name: z.string().nullable(),
  operator: z.string().nullable(),
  address: stationAddressSchema,
  latitude: z.number(),
  longitude: z.number(),
  connectors: z.array(connectorSchema),
  maxPowerKw: z.number().nullable(),
  numberOfPoints: z.number(),
  operationalStatus: z.string().nullable(),
  isOperational: z.boolean().nullable(),
  lastVerified: z.string().nullable(),
  /** "Public"/"Public - Membership Required"/... — see shared/schemas/ocm.ts. */
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
 * Columns `GET /api/stations` knows how to sort by. OCM does not
 * paginate/sort its geographic search: the BFF does it on top of the
 * already-cached result (see server/utils/paginate.ts), so the list is
 * bound to the fields that layer can read from `Station` — it is not an OCM
 * contract.
 */
export type StationSortKey = 'name' | 'operator' | 'town' | 'maxPowerKw' | 'operationalStatus'

/** Paginated response of `GET /api/stations`: not OCM data, no need for Zod. */
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
