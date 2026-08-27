import type { Tariff } from '~/modules/tariffs/domain/tariff'

export interface SessionCostInput {
  energyKwh: number
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Cost of ONE session with a tariff: energy × price/kWh, plus any minutes
 * parked past the end of charging × blocking fee. `overstayMinutes` is
 * manual (default 0): the synthetic sessions (day 12) do not model how long
 * a car stays plugged in after charging, so inventing that number from the
 * data would falsify it — better to leave it explicit to whoever uses the
 * calculator.
 *
 * The tariff's monthly fee does **not** enter this calculation: it is a
 * recurring cost independent of any session, not "how much this charge
 * costs" — conflating them would be a domain error, not just an
 * implementation one.
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
