import type { MonitoringZone } from "./types";

/** Approximate zone centroids [longitude, latitude] for aircraft plotting. */
export const ZONE_CENTROIDS: Record<MonitoringZone, [number, number]> = {
  East: [-77.0, 38.5],
  Central: [-96.5, 39.5],
  West: [-112.0, 40.5],
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Stable pseudo-position inside a zone for map markers (no GPS in registry yet). */
export function coordinatesForAircraft(
  aircraftId: string,
  zone: MonitoringZone,
): [number, number] {
  const [baseLng, baseLat] = ZONE_CENTROIDS[zone];
  const hash = hashString(aircraftId);
  const lngOffset = ((hash % 100) - 50) * 0.08;
  const latOffset = (((hash >> 8) % 100) - 50) * 0.06;
  return [baseLng + lngOffset, baseLat + latOffset];
}
