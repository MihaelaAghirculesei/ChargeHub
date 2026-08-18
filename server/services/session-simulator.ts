import type { Station } from '#shared/schemas/station'
import type { ChargingSession } from '#shared/schemas/session'
import { chargingPowerFraction, integrateEnergyKwh } from '~~/server/utils/charging-curve'
import { round } from '~~/server/utils/number'
import { hashString, mulberry32 } from '~~/server/utils/random'

/**
 * Storico sintetico di sessioni concluse per la tabella del Giorno 12 — non
 * un'estensione del simulatore di telemetria live (Giorno 10, un solo stato
 * "adesso" per connettore): qui serve un volume di righe indipendente dal
 * numero di connettori reali, per dimostrare la virtualizzazione della
 * tabella. Ogni sessione è generata da un indice (0..count-1) con lo stesso
 * approccio a seed di `telemetry-simulator.ts` — deterministica, non
 * accumulata in uno stato — e riusa la stessa curva di potenza
 * (`chargingPowerFraction`/`integrateEnergyKwh`) per restare coerente con
 * quello che la telemetria live mostra per una ricarica in corso.
 */

/** Numero di sessioni target: è il numero citato dal criterio "Fatto quando" del piano (scroll fluido su 2000 righe), non una stima di occupazione realistica. */
const DEFAULT_SESSION_COUNT = 2000
const DEFAULT_LOOKBACK_DAYS = 30
const DEFAULT_POWER_KW = 11
/** Placeholder finché non esiste un modulo tariffe reale (Giorno 15). */
const PRICE_PER_KWH_EUR = 0.45

const MIN_DURATION_MINUTES = 10
const MAX_DURATION_MINUTES = 90

export interface GenerateSessionsOptions {
  count?: number
  lookbackDays?: number
  now?: Date
}

export function generateSessions(
  stations: Station[],
  options: GenerateSessionsOptions = {}
): ChargingSession[] {
  const eligibleStations = stations.filter((station) => station.connectors.length > 0)
  if (eligibleStations.length === 0) return []

  const count = options.count ?? DEFAULT_SESSION_COUNT
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
  const now = options.now ?? new Date()
  const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000

  const sessions: ChargingSession[] = []

  for (let index = 0; index < count; index += 1) {
    const random = mulberry32(hashString(`session-${index}`))

    const station = eligibleStations[Math.floor(random() * eligibleStations.length)]
    if (!station) continue
    const connector = station.connectors[Math.floor(random() * station.connectors.length)]
    if (!connector) continue

    const startedAt = new Date(now.getTime() - random() * lookbackMs)
    const durationMinutes =
      MIN_DURATION_MINUTES + Math.floor(random() * (MAX_DURATION_MINUTES - MIN_DURATION_MINUTES))
    const durationSeconds = durationMinutes * 60
    const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000)

    const maxPowerKw = connector.powerKw ?? DEFAULT_POWER_KW
    // Elapsed === durata: integra sull'intera sessione, non su un istante
    // intermedio come fa la telemetria live per una ricarica in corso.
    const energyKwh = integrateEnergyKwh(durationSeconds, durationSeconds, maxPowerKw)
    const averagePowerKw = (energyKwh * 3600) / durationSeconds
    const peakPowerKw = maxPowerKw * chargingPowerFraction(0)

    sessions.push({
      id: `session-${index}`,
      stationId: station.id,
      stationName: station.name,
      connectorId: connector.id,
      connectorType: connector.type,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMinutes,
      energyKwh: round(energyKwh, 2),
      averagePowerKw: round(averagePowerKw, 1),
      peakPowerKw: round(peakPowerKw, 1),
      costEur: round(energyKwh * PRICE_PER_KWH_EUR, 2)
    })
  }

  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}
