export interface LatLng {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_KM = 6371

/**
 * Distance in km over the Earth's surface (haversine formula). Used by
 * `StationsMap.vue` to derive a search radius from the map's current
 * viewport (centre → north-east corner) when the user pans/zooms — OCM has
 * no bounding-box search, only radius.
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
