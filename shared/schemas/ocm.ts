import { z } from 'zod'

/**
 * Forma grezza delle risposte di Open Charge Map (v3 API).
 *
 * Solo i campi che ci servono davvero: uno schema Zod "stretto" (senza
 * `.passthrough()`) scarta automaticamente tutto il resto, quindi funge
 * anche da primo passo di normalizzazione. Non passare mai questi tipi
 * al frontend: sono la forma di OCM, non il dominio di ChargeHub
 * (vedi shared/schemas/station.ts).
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
  // Note libere di chi ha censito la stazione — spesso l'unica indicazione
  // di orari/accesso che OCM offre davvero (es. "durchgehend nutzbar"):
  // non esiste un campo "OpeningTimes" strutturato nell'API.
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
  // Tipo di accesso ("Public", "Public - Membership Required", "Private - ..."):
  // il proxy più vicino a "orari/chi può usarla" che OCM offra davvero.
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
