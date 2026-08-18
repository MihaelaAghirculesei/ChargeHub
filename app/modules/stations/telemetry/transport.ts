import type { StationTelemetry } from '#shared/schemas/telemetry'

/** Concetto puramente di trasporto: il server non emette mai questo stato. */
export type TelemetryConnectionStatus = 'live' | 'reconnecting' | 'offline'

export interface TelemetryTransportCallbacks {
  onUpdate: (data: StationTelemetry[]) => void
  onStatusChange: (status: TelemetryConnectionStatus) => void
}

/**
 * Astrae "come" arrivano gli aggiornamenti di telemetria da "cosa" ne fa
 * `useLiveTelemetry` (stato reattivo, pausa su tab nascosta, cleanup): il
 * composable parla solo di questa interfaccia, mai di polling/`setTimeout`
 * esplicitamente. Passare a SSE/WebSocket in futuro significa scrivere una
 * nuova implementazione (vedi `polling-transport.ts`), non toccare il
 * composable — vedi docs/adr/0003-live-updates.md.
 */
export interface TelemetryTransport {
  /** Avvia gli aggiornamenti continui per questi id. Richiama i callback finché non fermato. Restituisce la funzione di stop. */
  start(stationIds: number[], callbacks: TelemetryTransportCallbacks): () => void
}
