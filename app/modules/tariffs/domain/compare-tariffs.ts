import {
  calculateSessionCost,
  type SessionCostInput
} from '~/modules/tariffs/domain/calculate-session-cost'
import type { Tariff } from '~/modules/tariffs/domain/tariff'

export interface TariffComparisonResult {
  tariffId: string
  tariffName: string
  costEur: number
}

/** Cost of the same session across several tariffs, sorted from cheapest. */
export function compareTariffs(
  session: SessionCostInput,
  tariffs: Tariff[],
  overstayMinutes = 0
): TariffComparisonResult[] {
  return tariffs
    .map((tariff) => ({
      tariffId: tariff.id,
      tariffName: tariff.name,
      costEur: calculateSessionCost(session, tariff, overstayMinutes)
    }))
    .sort((a, b) => a.costEur - b.costEur)
}
