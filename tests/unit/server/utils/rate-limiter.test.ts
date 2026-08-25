import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '~~/server/utils/rate-limiter'

describe('createRateLimiter', () => {
  it('permette fino a maxAttempts fallimenti, poi blocca', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 3 })
    const now = 0

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(limiter.status('1.2.3.4', now).blocked).toBe(false)
      limiter.recordFailure('1.2.3.4', now)
    }

    expect(limiter.status('1.2.3.4', now).blocked).toBe(true)
  })

  it('riporta il tempo di attesa residuo fino alla fine della finestra', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.recordFailure('1.2.3.4', 0)

    expect(limiter.status('1.2.3.4', 45_000).retryAfterSeconds).toBe(15)
  })

  it('si sblocca da sola una volta scaduta la finestra', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.recordFailure('1.2.3.4', 0)

    expect(limiter.status('1.2.3.4', 60_000).blocked).toBe(false)
  })

  it('un successo resetta il contatore, indipendentemente dai fallimenti precedenti', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 2 })
    limiter.recordFailure('1.2.3.4', 0)
    limiter.recordFailure('1.2.3.4', 1_000)
    limiter.recordSuccess('1.2.3.4')

    expect(limiter.status('1.2.3.4', 2_000).blocked).toBe(false)
  })

  it('tiene i contatori separati per chiave', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.recordFailure('1.2.3.4', 0)

    expect(limiter.status('1.2.3.4', 0).blocked).toBe(true)
    expect(limiter.status('5.6.7.8', 0).blocked).toBe(false)
  })

  it('evita una crescita illimitata della mappa: oltre maxSize evince il bucket più vecchio', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1, maxSize: 2 })
    limiter.recordFailure('a', 0)
    limiter.recordFailure('b', 0)
    limiter.recordFailure('c', 0)

    // 'a' era il più vecchio: evinto per far posto a 'c', quindi risbloccato.
    expect(limiter.status('a', 0).blocked).toBe(false)
    expect(limiter.status('b', 0).blocked).toBe(true)
    expect(limiter.status('c', 0).blocked).toBe(true)
  })
})
