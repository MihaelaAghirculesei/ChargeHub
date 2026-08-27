import type { StationTelemetry } from '#shared/schemas/telemetry'

/** A purely transport-level concept: the server never emits this status. */
export type TelemetryConnectionStatus = 'live' | 'reconnecting' | 'offline'

export interface TelemetryTransportCallbacks {
  onUpdate: (data: StationTelemetry[]) => void
  onStatusChange: (status: TelemetryConnectionStatus) => void
}

/**
 * Abstracts "how" telemetry updates arrive from "what" `useLiveTelemetry`
 * does with them (reactive state, pause on hidden tab, cleanup): the
 * composable speaks only of this interface, never of polling/`setTimeout`
 * explicitly. Switching to SSE/WebSocket in future means writing a new
 * implementation (see `polling-transport.ts`), not touching the composable
 * — see docs/adr/0003-live-updates.md.
 */
export interface TelemetryTransport {
  /** Starts the continuous updates for these ids. Calls the callbacks until stopped. Returns the stop function. */
  start(stationIds: number[], callbacks: TelemetryTransportCallbacks): () => void
}
