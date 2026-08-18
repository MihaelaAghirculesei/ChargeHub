import type { Tariff } from '~/modules/tariffs/domain/tariff'

export interface SessionCostInput {
  energyKwh: number
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Costo di UNA sessione con una tariffa: energia × prezzo/kWh, più eventuali
 * minuti di sosta oltre la fine della ricarica × tariffa di blocco.
 * `overstayMinutes` è manuale (default 0): le sessioni sintetiche (Giorno
 * 12) non modellano quanto un'auto resta collegata dopo la ricarica, quindi
 * inventare quel numero dai dati sarebbe falsificarlo — meglio lasciarlo
 * esplicito a chi usa il calcolatore.
 *
 * Il canone mensile della tariffa **non** entra in questo calcolo: è un
 * costo ricorrente indipendente da qualunque sessione, non "quanto costa
 * questa ricarica" — confonderli sarebbe un errore di dominio, non solo di
 * implementazione.
 */
export function calculateSessionCost(
  session: SessionCostInput,
  tariff: Tariff,
  overstayMinutes = 0
): number {
  const energyCost = session.energyKwh * tariff.pricePerKwh
  const blockingCost = Math.max(0, overstayMinutes) * tariff.blockingFeePerMinute
  return round(energyCost + blockingCost, 2)
}
