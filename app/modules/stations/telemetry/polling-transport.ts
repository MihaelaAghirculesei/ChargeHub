import { FetchError } from 'ofetch'
import type { StationTelemetry } from '#shared/schemas/telemetry'
import type { TelemetryTransport } from '~/modules/stations/telemetry/transport'

const POLL_INTERVAL_MS = 5000
/** Consecutive failures after which to go from "reconnecting" to "offline". */
const OFFLINE_AFTER_FAILURES = 2

/**
 * The only place in the client code that knows telemetry lives behind
 * `/api/telemetry` — the same role as `stationRepository` for stations,
 * inside the transport here because it is its only consumer.
 *
 * `setTimeout` self-scheduled after each response, not `setInterval`: if a
 * request takes more than 5s (slow network, serverless cold start), no
 * second overlapping request starts — the next poll is always 5s after the
 * end of the last one, never queued behind requests still pending.
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
