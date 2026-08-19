import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StationTelemetry } from '#shared/schemas/telemetry'
import { pollingTelemetryTransport } from '~/modules/stations/telemetry/polling-transport'
import type { TelemetryConnectionStatus } from '~/modules/stations/telemetry/transport'

/**
 * Vero transport di produzione (a differenza di useLiveTelemetry.test.ts,
 * che usa un finto transport per isolare il composable) — qui si verifica
 * lo scheduling reale via `setTimeout` e la logica "reconnecting" dopo 1
 * fallimento / "offline" dopo 2 consecutivi.
 *
 * Solo `setTimeout`/`clearTimeout` sono finti (non l'intero orologio): il
 * mock di rete dietro `registerEndpoint` risolve comunque su microtask/
 * event-loop reali, quindi ogni avanzamento dei timer è seguito da un
 * `flushPromises()` reale per lasciarli risolvere.
 */
function makeStationTelemetry(): StationTelemetry[] {
  return [{ stationId: 1, timestamp: '2026-08-18T10:00:00.000Z', connectors: [] }]
}

/**
 * Un solo `flushPromises()` non basta sempre a svuotare l'intera catena di
 * microtask dietro `$fetch` (parsing della risposta del mock incluso, più
 * hop di quelli che un `await` sembra suggerire): ripetuto qualche volta è
 * un compromesso pragmatico più affidabile di indovinare il numero esatto.
 */
async function settle() {
  for (let i = 0; i < 5; i += 1) await flushPromises()
}

async function advance(ms: number) {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

let unregisterEndpoint: (() => void) | undefined

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  unregisterEndpoint?.()
  unregisterEndpoint = undefined
  vi.useRealTimers()
})

describe('pollingTelemetryTransport', () => {
  it('esegue subito un primo poll e notifica "live" + i dati al successo', async () => {
    unregisterEndpoint = registerEndpoint('/api/telemetry', () => makeStationTelemetry())
    const onUpdate = vi.fn()
    const onStatusChange = vi.fn()

    pollingTelemetryTransport.start([1], { onUpdate, onStatusChange })
    await settle()

    expect(onStatusChange).toHaveBeenCalledWith('live')
    expect(onUpdate).toHaveBeenCalledWith(makeStationTelemetry())
  })

  it('rischedula un nuovo poll 5s dopo la fine del precedente, non prima', async () => {
    let callCount = 0
    unregisterEndpoint = registerEndpoint('/api/telemetry', () => {
      callCount += 1
      return makeStationTelemetry()
    })

    pollingTelemetryTransport.start([1], { onUpdate: vi.fn(), onStatusChange: vi.fn() })
    await settle()
    expect(callCount).toBe(1)

    await advance(4999)
    expect(callCount).toBe(1)

    await advance(1)
    expect(callCount).toBe(2)
  })

  it('un fallimento isolato porta a "reconnecting", non "offline"', async () => {
    unregisterEndpoint = registerEndpoint('/api/telemetry', () => {
      throw createError({ statusCode: 502, statusMessage: 'Bad Gateway' })
    })
    const statuses: TelemetryConnectionStatus[] = []

    pollingTelemetryTransport.start([1], {
      onUpdate: vi.fn(),
      onStatusChange: (status) => statuses.push(status)
    })
    await settle()

    expect(statuses).toEqual(['reconnecting'])
  })

  it('due fallimenti consecutivi portano a "offline"', async () => {
    unregisterEndpoint = registerEndpoint('/api/telemetry', () => {
      throw createError({ statusCode: 502, statusMessage: 'Bad Gateway' })
    })
    const statuses: TelemetryConnectionStatus[] = []

    pollingTelemetryTransport.start([1], {
      onUpdate: vi.fn(),
      onStatusChange: (status) => statuses.push(status)
    })
    await settle()
    await advance(5000)

    expect(statuses).toEqual(['reconnecting', 'offline'])
  })

  it('un successo dopo dei fallimenti riazzera il contatore e torna a "live"', async () => {
    let shouldFail = true
    unregisterEndpoint = registerEndpoint('/api/telemetry', () => {
      if (shouldFail) throw createError({ statusCode: 502, statusMessage: 'Bad Gateway' })
      return makeStationTelemetry()
    })
    const statuses: TelemetryConnectionStatus[] = []

    pollingTelemetryTransport.start([1], {
      onUpdate: vi.fn(),
      onStatusChange: (status) => statuses.push(status)
    })
    await settle()
    expect(statuses).toEqual(['reconnecting'])

    shouldFail = false
    await advance(5000)
    expect(statuses).toEqual(['reconnecting', 'live'])
  })

  it('stop() ferma lo scheduling: nessun altro poll dopo la chiamata', async () => {
    let callCount = 0
    unregisterEndpoint = registerEndpoint('/api/telemetry', () => {
      callCount += 1
      return makeStationTelemetry()
    })

    const stop = pollingTelemetryTransport.start([1], {
      onUpdate: vi.fn(),
      onStatusChange: vi.fn()
    })
    await settle()
    expect(callCount).toBe(1)

    stop()
    await advance(20_000)
    expect(callCount).toBe(1)
  })
})
