import { z } from 'zod'

/**
 * Raw shape of Open Charge Map responses (v3 API).
 *
 * Only the fields we actually need: a "strict" Zod schema (no
 * `.passthrough()`) automatically drops everything else, so it also acts as
 * a first normalisation step. Never pass these types to the frontend: they
 * are OCM's shape, not ChargeHub's domain (see shared/schemas/station.ts).
 */

const ocmRefEntrySchema = z.object({
  ID: z.number(),
  Title: z.string().nullable().optional()
})

const ocmCountrySchema = z.object({
  ISOCode: z.string().nullable().optional(),
  Title: z.string().nullable().optional()
})

const ocmAddressInfoSchema = z.object({
  Title: z.string().nullable().optional(),
  AddressLine1: z.string().nullable().optional(),
  AddressLine2: z.string().nullable().optional(),
  Town: z.string().nullable().optional(),
  StateOrProvince: z.string().nullable().optional(),
  Postcode: z.string().nullable().optional(),
  Country: ocmCountrySchema.nullable().optional(),
  Latitude: z.number(),
  Longitude: z.number(),
  // Free-form notes from whoever recorded the station — often the only
  // hint about hours/access OCM really offers (e.g. "durchgehend nutzbar"):
  // there is no structured "OpeningTimes" field in the API.
  AccessComments: z.string().nullable().optional()
})

const ocmOperatorInfoSchema = z.object({
  ID: z.number().nullable().optional(),
  Title: z.string().nullable().optional()
})

const ocmStatusTypeSchema = z.object({
  ID: z.number().nullable().optional(),
  Title: z.string().nullable().optional(),
  IsOperational: z.boolean().nullable().optional()
})

const ocmLevelSchema = z.object({
  ID: z.number().nullable().optional(),
  Title: z.string().nullable().optional()
})

const ocmConnectionSchema = z.object({
  ID: z.number(),
  ConnectionTypeID: z.number().nullable().optional(),
  ConnectionType: ocmRefEntrySchema.nullable().optional(),
  StatusTypeID: z.number().nullable().optional(),
  Level: ocmLevelSchema.nullable().optional(),
  PowerKW: z.number().nullable().optional(),
  Quantity: z.number().nullable().optional()
})

export const ocmPoiSchema = z.object({
  ID: z.number(),
  UUID: z.string(),
  AddressInfo: ocmAddressInfoSchema,
  OperatorInfo: ocmOperatorInfoSchema.nullable().optional(),
  StatusType: ocmStatusTypeSchema.nullable().optional(),
  // Access type ("Public", "Public - Membership Required", "Private - ..."):
  // the closest proxy to "hours / who can use it" that OCM really offers.
  UsageType: ocmRefEntrySchema.nullable().optional(),
  Connections: z.array(ocmConnectionSchema).nullable().optional(),
  NumberOfPoints: z.number().nullable().optional(),
  DateLastVerified: z.string().nullable().optional()
})

export const ocmPoiListSchema = z.array(ocmPoiSchema)

export const ocmReferenceDataSchema = z.object({
  ConnectionTypes: z.array(ocmRefEntrySchema),
  Operators: z.array(ocmRefEntrySchema),
  StatusTypes: z.array(
    ocmRefEntrySchema.extend({
      IsOperational: z.boolean().nullable().optional()
    })
  )
})

export type OcmPoi = z.infer<typeof ocmPoiSchema>
export type OcmReferenceData = z.infer<typeof ocmReferenceDataSchema>
