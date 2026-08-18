import { z } from 'zod'

/**
 * Le 4 grandezze richieste dal piano per una tariffa: nome, prezzo €/kWh,
 * tariffa di blocco (Blockiergebühr, €/minuto — comune nel mercato tedesco
 * per scoraggiare di lasciare l'auto collegata dopo fine ricarica) e canone
 * mensile. Validata con Zod perché è l'unico punto di ingresso di dati
 * inseriti a mano dall'utente in questo modulo (a differenza dei dati OCM,
 * mai validati con lo schema "sbagliato").
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
