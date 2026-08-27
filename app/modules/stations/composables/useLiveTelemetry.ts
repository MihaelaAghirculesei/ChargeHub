import type { StationTelemetry } from '#shared/schemas/telemetry'
import { pollingTelemetryTransport } from '~/modules/stations/telemetry/polling-transport'
import type {
  TelemetryConnectionStatus,
  TelemetryTransport
} from '~/modules/stations/telemetry/transport'

interface UseLiveTelemetryOptions {
  transport?: TelemetryTransport
  /** Injectable for tests only: normally it is the real `useDocumentVisibility()`. */
  visibility?: Ref<DocumentVisibilityState>
}

/**
 * Polling every 5s (behind `TelemetryTransport`, see
 * docs/adr/0003-live-updates.md) for the given ids, with an automatic pause
 * when the tab is not visible: no call to the server for a background tab,
 * resumed as soon as it becomes visible again.
 */
export function useLiveTelemetry(
  stationIds: MaybeRefOrGetter<number[]>,
  options: UseLiveTelemetryOptions = {}
) {
  const { transport = pollingTelemetryTransport, visibility = useDocumentVisibility() } = options

  const telemetry = ref<StationTelemetry[]>([])
  const status = ref<TelemetryConnectionStatus>('reconnecting')

  let stopTransport: (() => void) | null = null

  function startPolling() {
    // Client-side only: during SSR it makes no sense to open a polling loop
    // that outlives the single request's response (see the serverless
    // constraint already discussed for the simulator, ADR-0002).
    if (!import.meta.client || stopTransport) return
    const ids = toValue(stationIds)
    if (ids.length === 0) return

    stopTransport = transport.start(ids, {
      onUpdate: (data) => {
        telemetry.value = data
      },
      onStatusChange: (next) => {
        status.value = next
      }
    })
  }

  function stopPolling() {
    stopTransport?.()
    stopTransport = null
  }

  watch(
    visibility,
    (value) => {
      if (value === 'visible') startPolling()
      else stopPolling()
    },
    { immediate: true }
  )

  watch(
    () => toValue(stationIds),
    () => {
      stopPolling()
      if (visibility.value === 'visible') startPolling()
    }
  )

  onScopeDispose(stopPolling)

  return { telemetry: readonly(telemetry), status: readonly(status) }
}
