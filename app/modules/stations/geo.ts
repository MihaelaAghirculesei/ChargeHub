export interface LatLng {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_KM = 6371

/**
 * Distanza in km sulla superficie terrestre (formula haversine). Usata da
 * `StationsMap.vue` per derivare un raggio di ricerca dal viewport corrente
 * della mappa (centro → angolo nord-est) quando l'utente sposta/zooma —
 * OCM non ha una ricerca per bounding box, solo per raggio.
 */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const deltaLat = toRad(b.latitude - a.latitude)
  const deltaLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}
