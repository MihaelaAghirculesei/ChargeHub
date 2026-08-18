/**
 * Sessione di ricarica conclusa, dato non-OCM (come `StationTelemetry`,
 * `shared/schemas/telemetry.ts`): OCM non ha un concetto di sessione, solo
 * il registro delle stazioni. Generata dal simulatore, vedi
 * server/services/session-simulator.ts.
 */
export interface ChargingSession {
  id: string
  stationId: number
  stationName: string
  connectorId: number
  connectorType: string
  /** ISO 8601. */
  startedAt: string
  /** ISO 8601. */
  endedAt: string
  durationMinutes: number
  energyKwh: number
  averagePowerKw: number
  peakPowerKw: number
  costEur: number
}
