import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StationTelemetry } from '#shared/schemas/telemetry'
import { pollingTelemetryTransport } from '~/modules/stations/telemetry/polling-transport'
import type { TelemetryConnectionStatus } from '~/modules/stations/telemetry/transport'

/**
 * The real production transport (unlike useLiveTelemetry.test.ts, which
 * uses a fake transport to isolate the composable) — here we verify the
 * real scheduling via `setTimeout` and the "reconnecting" after 1 failure /
 * "offline" after 2 consecutive failures logic.
 *
 * Only `setTimeout`/`clearTimeout` are faked (not the whole clock): the
 * network mock behind `registerEndpoint` still resolves on real
 * microtask/event-loop, so every timer advance is followed by a real
 * `flushPromises()` to let them resolve.
 */
function makeStationTelemetry(): StationTelemetry[] {
  return [{ stationId: 1, timestamp: '2026-08-18T10:00:00.000Z', connectors: [] }]
}

/**
 * A single `flushPromises()` is not always enough to drain the whole chain
 * of microtasks behind `$fetch` (parsing the mock response included, more
 * hops than an `await` seems to suggest): repeating it a few times is a
 * pragmatic compromise more reliable than guessing the exact number.
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
  it('runs a first poll immediately and notifies "live" + the data on success', async () => {
    unregisterEndpoint = registerEndpoint('/api/telemetry', () => makeStationTelemetry())
    const onUpdate = vi.fn()
    const onStatusChange = vi.fn()

    pollingTelemetryTransport.start([1], { onUpdate, onStatusChange })
    await settle()

    expect(onStatusChange).toHaveBeenCalledWith('live')
    expect(onUpdate).toHaveBeenCalledWith(makeStationTelemetry())
  })

  it('reschedules a new poll 5s after the previous one ends, not before', async () => {
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

  it('an isolated failure leads to "reconnecting", not "offline"', async () => {
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

  it('two consecutive failures lead to "offline"', async () => {
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

  it('a success after failures resets the counter and returns to "live"', async () => {
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

  it('stop() halts the scheduling: no further poll after the call', async () => {
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
