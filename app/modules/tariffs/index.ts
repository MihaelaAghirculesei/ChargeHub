/**
 * Unico punto di export pubblico del modulo tariffe.
 */
export { calculateSessionCost } from '~/modules/tariffs/domain/calculate-session-cost'
export type { SessionCostInput } from '~/modules/tariffs/domain/calculate-session-cost'
export { compareTariffs } from '~/modules/tariffs/domain/compare-tariffs'
export type { TariffComparisonResult } from '~/modules/tariffs/domain/compare-tariffs'
export type { Tariff, TariffInput } from '~/modules/tariffs/domain/tariff'
export { useTariffsStore } from '~/modules/tariffs/stores/tariffs.store'
