import type { StationTelemetry } from '#shared/schemas/telemetry'
import { pollingTelemetryTransport } from '~/modules/stations/telemetry/polling-transport'
import type {
  TelemetryConnectionStatus,
  TelemetryTransport
} from '~/modules/stations/telemetry/transport'

interface UseLiveTelemetryOptions {
  transport?: TelemetryTransport
  /** Iniettabile solo per i test: di norma è `useDocumentVisibility()` vero. */
  visibility?: Ref<DocumentVisibilityState>
}

/**
 * Polling ogni 5s (dietro `TelemetryTransport`, vedi
 * docs/adr/0003-live-updates.md) per gli id indicati, con pausa automatica
 * quando la scheda non è visibile: nessuna chiamata al server per una scheda
 * in background, ripresa non appena torna visibile.
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
    // Solo lato client: durante SSR non ha senso aprire un ciclo di polling
    // che sopravvive oltre la risposta della singola richiesta (vedi il
    // vincolo serverless già discusso per il simulatore, ADR-0002).
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
