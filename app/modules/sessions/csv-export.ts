import type { ChargingSession } from '#shared/schemas/session'

const CSV_HEADERS = [
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

function escapeCsvField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function sessionToRow(session: ChargingSession): (string | number)[] {
  return [
    session.stationName,
    session.connectorType,
    session.startedAt,
    session.endedAt,
    session.durationMinutes,
    session.energyKwh,
    session.averagePowerKw,
    session.peakPowerKw,
    session.costEur
  ]
}

/** Solo la parte pura (testabile senza DOM): stringa CSV, non il download. */
export function sessionsToCsv(sessions: ChargingSession[]): string {
  const rows = [CSV_HEADERS, ...sessions.map(sessionToRow)]
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n')
}

/** Innesca il download nel browser — non testabile senza un DOM vero, vedi `sessionsToCsv` sopra per la logica. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
