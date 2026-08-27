/**
 * Power curve shared by live telemetry (day 10) and synthetic historical
 * sessions (day 12): the same plausible charging "shape" in both cases, not
 * two curves invented separately.
 */

/**
 * Fraction of max power as a function of session progress (0..1): high and
 * nearly flat up to 80%, then falls more steeply (a plausible charging
 * curve, not linear all the way to the end).
 */
export function chargingPowerFraction(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1)
  if (clamped <= 0.8) {
    return 1 - 0.3 * (clamped / 0.8)
  }
  return 0.7 - 0.55 * ((clamped - 0.8) / 0.2)
}

/**
 * Energy (kWh) accumulated by numerically integrating the power curve
 * between 0 and `elapsedSeconds` of a session of length
 * `chargingDurationSeconds` (trapezoidal integration, 60 samples: cheap and
 * avoids having to trust a hand-written closed-form integral). Passing
 * `elapsedSeconds === chargingDurationSeconds` gives the energy of the whole
 * session.
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
