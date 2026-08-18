/**
 * Curva di potenza condivisa da telemetria live (Giorno 10) e sessioni
 * storiche sintetiche (Giorno 12): stessa "forma" di ricarica plausibile in
 * entrambi i casi, non due curve inventate separatamente.
 */

/**
 * Frazione della potenza massima in funzione dell'avanzamento (0..1) della
 * sessione: alta e quasi piatta fino all'80%, poi decresce più ripida
 * (curva di ricarica plausibile, non lineare fino alla fine).
 */
export function chargingPowerFraction(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1)
  if (clamped <= 0.8) {
    return 1 - 0.3 * (clamped / 0.8)
  }
  return 0.7 - 0.55 * ((clamped - 0.8) / 0.2)
}

/**
 * Energia (kWh) accumulata integrando numericamente la curva di potenza tra
 * 0 e `elapsedSeconds` di una sessione lunga `chargingDurationSeconds`
 * (integrazione trapezoidale, 60 campioni: economica e evita di doversi
 * fidare di un integrale in forma chiusa scritto a mano). Passare
 * `elapsedSeconds === chargingDurationSeconds` dà l'energia dell'intera
 * sessione.
 */
export function integrateEnergyKwh(
  elapsedSeconds: number,
  chargingDurationSeconds: number,
  maxPowerKw: number
): number {
  const steps = 60
  const stepSeconds = elapsedSeconds / steps
  let energy = 0

  for (let index = 0; index < steps; index += 1) {
    const t1 = index * stepSeconds
    const t2 = (index + 1) * stepSeconds
    const p1 = maxPowerKw * chargingPowerFraction(t1 / chargingDurationSeconds)
    const p2 = maxPowerKw * chargingPowerFraction(t2 / chargingDurationSeconds)
    energy += ((p1 + p2) / 2) * (stepSeconds / 3600)
  }

  return energy
}
