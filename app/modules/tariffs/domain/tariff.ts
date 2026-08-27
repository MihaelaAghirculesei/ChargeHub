import { z } from 'zod'

/**
 * The 4 quantities the plan requires for a tariff: name, price €/kWh,
 * blocking fee (Blockiergebühr, €/minute — common in the German market to
 * discourage leaving the car plugged in after charging ends) and monthly
 * fee. Validated with Zod because it is the only entry point for
 * hand-entered user data in this module (unlike the OCM data, never
 * validated with the "wrong" schema).
 */
export const tariffInputSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich'),
  pricePerKwh: z.number().nonnegative('Preis darf nicht negativ sein'),
  blockingFeePerMinute: z.number().nonnegative('Blockiergebühr darf nicht negativ sein'),
  monthlyFeeEur: z.number().nonnegative('Grundgebühr darf nicht negativ sein')
})

export type TariffInput = z.infer<typeof tariffInputSchema>

export const tariffSchema = tariffInputSchema.extend({
  id: z.string()
})

export type Tariff = z.infer<typeof tariffSchema>
