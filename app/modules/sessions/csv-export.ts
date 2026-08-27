import type { ChargingSession } from '#shared/schemas/session'

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

/**
 * Only the pure part (testable without a DOM): the CSV string, not the
 * download. `headers` is a parameter (not a fixed constant) on purpose: the
 * headers are translated text (day 17) and this function has no Nuxt
 * context to call `useI18n()` itself — it stays a pure function, the caller
 * (the page) passes the strings already translated for the active language.
 */
export function sessionsToCsv(sessions: ChargingSession[], headers: string[]): string {
  const rows = [headers, ...sessions.map(sessionToRow)]
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n')
}

/** Triggers the download in the browser — not testable without a real DOM, see `sessionsToCsv` above for the logic. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
