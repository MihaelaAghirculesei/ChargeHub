import { describe, expect, it } from 'vitest'
import type { ChargingSession } from '#shared/schemas/session'
import { sessionsToCsv } from '~/modules/sessions/csv-export'

function makeSession(overrides: Partial<ChargingSession> = {}): ChargingSession {
  return {
    id: 'session-1',
    stationId: 1,
    stationName: 'Rathaus',
    connectorId: 10,
    connectorType: 'Type 2',
    startedAt: '2026-08-18T10:00:00.000Z',
    endedAt: '2026-08-18T10:30:00.000Z',
    durationMinutes: 30,
    energyKwh: 5.5,
    averagePowerKw: 11,
    peakPowerKw: 22,
    costEur: 2.48,
    ...overrides
  }
}

const HEADERS = [
  'Station',
  'Anschluss',
  'Start',
  'Ende',
  'Dauer (min)',
  'Energie (kWh)',
  'Ø Leistung (kW)',
  'Spitzenleistung (kW)',
  'Kosten (€)'
]

describe('sessionsToCsv', () => {
  it("include l'intestazione (passata dal chiamante) anche con nessuna sessione", () => {
    const csv = sessionsToCsv([], HEADERS)
    expect(csv).toBe(
      'Station,Anschluss,Start,Ende,Dauer (min),Energie (kWh),Ø Leistung (kW),Spitzenleistung (kW),Kosten (€)'
    )
  })

  it('serializza una riga per sessione, nello stesso ordine delle colonne', () => {
    const csv = sessionsToCsv([makeSession()], HEADERS)
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe(
      'Rathaus,Type 2,2026-08-18T10:00:00.000Z,2026-08-18T10:30:00.000Z,30,5.5,11,22,2.48'
    )
  })

  it('mette tra virgolette i campi che contengono una virgola, riscrivendo le virgolette interne', () => {
    const csv = sessionsToCsv([makeSession({ stationName: 'Parkhaus, Ebene 2 "Nord"' })], HEADERS)
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('"Parkhaus, Ebene 2 ""Nord"""')
  })
})
