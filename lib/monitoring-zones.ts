import type { MonitoringZone, ZoneFilter } from "./types";

export const ZONE_FILTER_OPTIONS: { value: ZoneFilter; label: string }[] = [
  { value: "all", label: "Monitor All" },
  { value: "East", label: "East" },
  { value: "Central", label: "Central" },
  { value: "West", label: "West" },
];

/** Left-to-right order on the CONUS map (West coast → East coast). */
export const GEOGRAPHIC_ZONE_ORDER: MonitoringZone[] = [
  "West",
  "Central",
  "East",
];

export function filterByZone<T extends { monitoringZone: MonitoringZone }>(
  items: T[],
  zoneFilter: ZoneFilter,
): T[] {
  if (zoneFilter === "all") return items;
  return items.filter((item) => item.monitoringZone === zoneFilter);
}
