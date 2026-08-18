import { FetchError } from 'ofetch'
import type { StationTelemetry } from '#shared/schemas/telemetry'
import type { TelemetryTransport } from '~/modules/stations/telemetry/transport'

const POLL_INTERVAL_MS = 5000
/** Fallimenti consecutivi dopo cui passare da "riconnessione" a "offline". */
const OFFLINE_AFTER_FAILURES = 2

/**
 * Unico punto del codice client che sa che la telemetria vive dietro
 * `/api/telemetry` — stesso ruolo di `stationRepository` per le stazioni,
 * qui dentro il transport perché è il suo unico consumatore.
 *
 * `setTimeout` auto-schedulato dopo ogni risposta, non `setInterval`: se una
 * richiesta impiega più di 5s (rete lenta, cold start serverless), non parte
 * una seconda richiesta sovrapposta — il prossimo poll è sempre 5s dopo la
 * fine dell'ultimo, mai in coda dietro richieste ancora pendenti.
 */
export const pollingTelemetryTransport: TelemetryTransport = {
  start(stationIds, { onUpdate, onStatusChange }) {
    let stopped = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let consecutiveFailures = 0

    async function poll() {
      if (stopped) return
      try {
        const data = await $fetch<StationTelemetry[]>('/api/telemetry', {
          query: { stationId: stationIds.join(',') }
        })
        consecutiveFailures = 0
        onStatusChange('live')
        onUpdate(data)
      } catch (error) {
        if (!(error instanceof FetchError)) throw error
        consecutiveFailures += 1
        onStatusChange(consecutiveFailures >= OFFLINE_AFTER_FAILURES ? 'offline' : 'reconnecting')
      } finally {
        if (!stopped) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS)
        }
      }
    }

    poll()

    return () => {
      stopped = true
      clearTimeout(timeoutId)
    }
  }
}
