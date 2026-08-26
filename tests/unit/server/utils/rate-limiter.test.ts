import { describe, expect, it } from 'vitest'
import {
  NL_SEARCH_DAILY_CAP_KEY,
  createRateLimiter,
  nlSearchDailyCap
} from '~~/server/utils/rate-limiter'

describe('createRateLimiter', () => {
  it('permette fino a maxAttempts tentativi, poi blocca', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 3 })
    const now = 0

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(limiter.reserve('1.2.3.4', now).blocked).toBe(false)
    }

    expect(limiter.reserve('1.2.3.4', now).blocked).toBe(true)
  })

  it('riporta il tempo di attesa residuo fino alla fine della finestra', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.reserve('1.2.3.4', 0)

    expect(limiter.status('1.2.3.4', 45_000).retryAfterSeconds).toBe(15)
  })

  it('si sblocca da sola una volta scaduta la finestra', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.reserve('1.2.3.4', 0)

    expect(limiter.status('1.2.3.4', 60_000).blocked).toBe(false)
  })

  it('un successo resetta il contatore, indipendentemente dai tentativi precedenti', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 2 })
    limiter.reserve('1.2.3.4', 0)
    limiter.reserve('1.2.3.4', 1_000)
    limiter.recordSuccess('1.2.3.4')

    expect(limiter.status('1.2.3.4', 2_000).blocked).toBe(false)
  })

  it('release() restituisce un solo tentativo prenotato, senza scendere sotto zero', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 2 })
    limiter.reserve('k', 0)
    limiter.reserve('k', 0)
    expect(limiter.status('k', 0).blocked).toBe(true)

    limiter.release('k', 0)
    expect(limiter.status('k', 0).blocked).toBe(false) // di nuovo sotto soglia
    expect(limiter.reserve('k', 0).blocked).toBe(false) // e c'è spazio per un altro

    limiter.release('k', 0)
    limiter.release('k', 0)
    limiter.release('k', 0) // extra oltre lo zero: non deve andare in negativo
    limiter.reserve('k', 0)
    limiter.reserve('k', 0)
    expect(limiter.reserve('k', 0).blocked).toBe(true) // soglia ancora a 2, non "sbloccata" da un conteggio negativo
  })

  it('release() è un no-op se la finestra è già scaduta (nessun bucket vivo)', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.reserve('k', 0)
    limiter.release('k', 60_001)

    // Nuova finestra: il contatore riparte comunque da zero, il release non
    // ha "regalato" un tentativo alla finestra vecchia né a quella nuova.
    expect(limiter.reserve('k', 60_001).blocked).toBe(false)
    expect(limiter.reserve('k', 60_001).blocked).toBe(true)
  })

  it('tiene i contatori separati per chiave', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.reserve('1.2.3.4', 0)

    expect(limiter.status('1.2.3.4', 0).blocked).toBe(true)
    expect(limiter.status('5.6.7.8', 0).blocked).toBe(false)
  })

  it('evita una crescita illimitata della mappa: oltre maxSize evince il bucket più vecchio', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1, maxSize: 2 })
    limiter.reserve('a', 0)
    limiter.reserve('b', 0)
    limiter.reserve('c', 0)

    // 'a' era il più vecchio: evinto per far posto a 'c', quindi risbloccato.
    expect(limiter.status('a', 0).blocked).toBe(false)
    expect(limiter.status('b', 0).blocked).toBe(true)
    expect(limiter.status('c', 0).blocked).toBe(true)
  })

  it('reserve() controlla e incrementa in una sola chiamata sincrona: N chiamate consecutive bloccano esattamente alla Nesima', () => {
    // Copre un bug reale trovato in code review: un check e un incremento
    // separati da un `await` (status() poi recordFailure() dopo aver letto
    // il body) lasciavano passare più tentativi concorrenti di maxAttempts,
    // perché nessuna delle due chiamate incrementava subito il contatore.
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 5 })
    const results = Array.from({ length: 6 }, () => limiter.reserve('1.2.3.4', 0).blocked)

    expect(results).toEqual([false, false, false, false, false, true])
  })

  it('un bucket riattivato dopo la scadenza della finestra non viene evinto al posto di uno davvero più vecchio', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1, maxSize: 2 })
    limiter.reserve('old', 0)
    limiter.reserve('other', 1)
    limiter.reserve('old', 60_001) // finestra scaduta, si riattiva: deve "ringiovanire" in ordine
    limiter.reserve('newest', 60_001) // maxSize=2 superato: deve evincere 'other', non 'old' appena riattivato

    expect(limiter.status('old', 60_001).blocked).toBe(true)
    expect(limiter.status('other', 60_001).blocked).toBe(false)
  })
})

describe('nlSearchDailyCap (tetto globale giornaliero, ADR-0007)', () => {
  // Singleton di modulo: uso una finestra temporale isolata (`base`) lontana
  // da 0 così questo blocco non interferisce con nessun altro test del file
  // e viceversa — il bucket resta pieno solo dentro le sue 24h simulate.
  const base = 10_000_000_000

  it('blocca oltre 200 ricerche al giorno sommando tutte le chiamate, non per IP', () => {
    for (let call = 0; call < 200; call += 1) {
      expect(nlSearchDailyCap.reserve(NL_SEARCH_DAILY_CAP_KEY, base).blocked).toBe(false)
    }

    expect(nlSearchDailyCap.reserve(NL_SEARCH_DAILY_CAP_KEY, base).blocked).toBe(true)
  })

  it('si azzera dopo 24h', () => {
    expect(nlSearchDailyCap.status(NL_SEARCH_DAILY_CAP_KEY, base + 86_400_000).blocked).toBe(false)
  })
})
