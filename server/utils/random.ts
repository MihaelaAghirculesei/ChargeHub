/**
 * Utilità deterministiche condivise da qualunque simulatore (telemetria,
 * Giorno 10; sessioni, Giorno 12): stesso seed → stessa sequenza, sempre.
 */

/** Hash stringa → intero 32 bit, FNV-1a. Deterministico, nessuna dipendenza. */
export function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** PRNG Mulberry32: da un seed intero produce una sequenza deterministica in [0,1). */
export function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
