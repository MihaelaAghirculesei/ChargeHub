/**
 * Simulated status of a charge point, OCPP-style. Non-OCM data: OCM is a
 * registry (see shared/schemas/station.ts), it offers no live telemetry —
 * why it is simulated and how it would be replaced with a real feed is in
 * docs/adr/0002-telemetry-simulation.md.
 */
export type ChargePointStatus = 'Available' | 'Charging' | 'Faulted' | 'Offline'

export interface ChargePointTelemetry {
  connectorId: number
  status: ChargePointStatus
  /** Instantaneous kW, only during a charging session. */
  powerKw: number | null
  /** kWh accumulated in the current session, only during a charge. */
  sessionEnergyKwh: number | null
  /** Duration of the current session in seconds, only during a charge. */
  sessionDurationSeconds: number | null
}

export interface StationTelemetry {
  stationId: number
  timestamp: string
  connectors: ChargePointTelemetry[]
}
