import { effectScope, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StationTelemetry } from '#shared/schemas/telemetry'
import { useLiveTelemetry } from '~/modules/stations/composables/useLiveTelemetry'
import type {
  TelemetryConnectionStatus,
  TelemetryTransport,
  TelemetryTransportCallbacks
} from '~/modules/stations/telemetry/transport'

function makeFakeTransport() {
  const startCalls: number[][] = []
  const stopFn = vi.fn()
  let callbacks: TelemetryTransportCallbacks | null = null

  const transport: TelemetryTransport = {
    start(stationIds, cb) {
      startCalls.push(stationIds)
      callbacks = cb
      return stopFn
    }
  }

  return {
    transport,
    startCalls,
    stopFn,
    emitUpdate: (data: StationTelemetry[]) => callbacks?.onUpdate(data),
    emitStatus: (status: TelemetryConnectionStatus) => callbacks?.onStatusChange(status)
  }
}

function makeStationTelemetry(overrides: Partial<StationTelemetry> = {}): StationTelemetry {
  return {
    stationId: 1,
    timestamp: '2026-08-18T10:00:00.000Z',
    connectors: [
      {
        connectorId: 10,
        status: 'Charging',
        powerKw: 15,
        sessionEnergyKwh: 2,
        sessionDurationSeconds: 300
      }
    ],
    ...overrides
  }
}

let activeScope: ReturnType<typeof effectScope> | null = null

afterEach(() => {
  activeScope?.stop()
  activeScope = null
})

describe('useLiveTelemetry', () => {
  it('avvia il transport con gli id indicati quando la scheda è visibile', () => {
    const { transport, startCalls } = makeFakeTransport()
    const visibility = ref<DocumentVisibilityState>('visible')
    activeScope = effectScope()

    activeScope.run(() => {
      useLiveTelemetry([1, 2], { transport, visibility })
    })

    expect(startCalls).toEqual([[1, 2]])
  })

  it('non avvia il transport quando la scheda parte già nascosta', () => {
    const { transport, startCalls } = makeFakeTransport()
    const visibility = ref<DocumentVisibilityState>('hidden')
    activeScope = effectScope()

    activeScope.run(() => {
      useLiveTelemetry([1], { transport, visibility })
    })

    expect(startCalls).toHaveLength(0)
  })

  it('ferma il transport quando la scheda passa in background e lo riavvia quando torna visibile', async () => {
    const { transport, startCalls, stopFn } = makeFakeTransport()
    const visibility = ref<DocumentVisibilityState>('visible')
    activeScope = effectScope()

    activeScope.run(() => {
      useLiveTelemetry([1], { transport, visibility })
    })
    expect(startCalls).toHaveLength(1)

    visibility.value = 'hidden'
    await nextTick()
    expect(stopFn).toHaveBeenCalledTimes(1)

    visibility.value = 'visible'
    await nextTick()
    expect(startCalls).toHaveLength(2)
  })

  it('espone gli aggiornamenti e lo stato di connessione emessi dal transport', () => {
    const { transport, emitUpdate, emitStatus } = makeFakeTransport()
    const visibility = ref<DocumentVisibilityState>('visible')
    activeScope = effectScope()

    const result = activeScope.run(() => useLiveTelemetry([1], { transport, visibility }))!

    expect(result.status.value).toBe('reconnecting')

    const snapshot = [makeStationTelemetry()]
    emitUpdate(snapshot)
    emitStatus('live')

    expect(result.telemetry.value).toEqual(snapshot)
    expect(result.status.value).toBe('live')
  })

  it('ferma il transport quando lo scope viene distrutto (cleanup al dismount)', () => {
    const { transport, stopFn } = makeFakeTransport()
    const visibility = ref<DocumentVisibilityState>('visible')
    const scope = effectScope()

    scope.run(() => {
      useLiveTelemetry([1], { transport, visibility })
    })
    scope.stop()

    expect(stopFn).toHaveBeenCalledTimes(1)
  })

  it('riavvia il transport con i nuovi id quando la lista di stazioni cambia', async () => {
    const { transport, startCalls, stopFn } = makeFakeTransport()
    const visibility = ref<DocumentVisibilityState>('visible')
    const ids = ref([1])
    activeScope = effectScope()

    activeScope.run(() => {
      useLiveTelemetry(() => ids.value, { transport, visibility })
    })
    expect(startCalls).toEqual([[1]])

    ids.value = [2, 3]
    await nextTick()

    expect(stopFn).toHaveBeenCalledTimes(1)
    expect(startCalls.at(-1)).toEqual([2, 3])
  })
})
