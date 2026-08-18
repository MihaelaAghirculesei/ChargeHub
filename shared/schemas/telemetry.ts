/**
 * Stato simulato di un punto di ricarica, in stile OCPP. Dati non-OCM: OCM è
 * un registro (vedi shared/schemas/station.ts), non offre telemetria live —
 * perché è simulata e come si sostituirebbe con un feed reale è in
 * docs/adr/0002-telemetry-simulation.md.
 */
export type ChargePointStatus = 'Available' | 'Charging' | 'Faulted' | 'Offline'

export interface ChargePointTelemetry {
  connectorId: number
  status: ChargePointStatus
  /** kW istantanei, solo durante una sessione di ricarica. */
  powerKw: number | null
  /** kWh accumulati nella sessione corrente, solo durante una ricarica. */
  sessionEnergyKwh: number | null
  /** Durata della sessione corrente in secondi, solo durante una ricarica. */
  sessionDurationSeconds: number | null
}

export interface StationTelemetry {
  stationId: number
  timestamp: string
  connectors: ChargePointTelemetry[]
}
