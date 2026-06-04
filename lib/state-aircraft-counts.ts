import { getAircraftStatus } from "./aircraft-status";
import { isFlightInEmergency } from "./emergency-workflow";
import { getZoneForStateAbbr } from "./monitoring-region-config";
import { getZoneForStateFips, STATE_FIPS_TO_ABBR } from "./us-state-zones";
import type {
  ActiveFlight,
  Aircraft,
  AircraftStatus,
  MonitoringZone,
} from "./types";

/** Per-state traffic metrics — extensible for alerts, weather, workload. */
export type StateTrafficMetrics = {
  fips: string;
  abbr: string | null;
  zone: MonitoringZone;
  activeCount: number;
  alertCount: number;
  emergencyCount: number;
};

export type StateCountsModel = {
  byFips: Map<string, StateTrafficMetrics>;
  zoneTotals: Record<
    MonitoringZone,
    { activeCount: number; alertCount: number; emergencyCount: number }
  >;
  totalActive: number;
};

const ABBR_TO_FIPS: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_FIPS_TO_ABBR).map(([fips, abbr]) => [abbr, fips]),
);

export type StateCountTier = "zero" | "low" | "medium" | "high";

export function getStateCountTier(count: number): StateCountTier {
  if (count <= 0) return "zero";
  if (count <= 2) return "low";
  if (count <= 5) return "medium";
  return "high";
}

function emptyMetrics(fips: string, abbr: string | null): StateTrafficMetrics {
  const zone = getZoneForStateFips(fips) ?? "Central";
  return {
    fips,
    abbr,
    zone,
    activeCount: 0,
    alertCount: 0,
    emergencyCount: 0,
  };
}

function initAllStates(): Map<string, StateTrafficMetrics> {
  const map = new Map<string, StateTrafficMetrics>();
  for (const [fips, abbr] of Object.entries(STATE_FIPS_TO_ABBR)) {
    map.set(fips, emptyMetrics(fips, abbr));
  }
  return map;
}

/**
 * Count active in-flight aircraft per state (home state from registry).
 * Excludes archived flights, inactive registry aircraft, and non-active sessions.
 */
export function buildStateActiveCounts(
  activeFlights: ActiveFlight[],
  aircraftRegistry: Aircraft[],
  now = Date.now(),
): StateCountsModel {
  const byFips = initAllStates();
  const registryById = new Map(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft]));

  for (const flight of activeFlights) {
    const aircraft = registryById.get(flight.aircraftId);
    if (!aircraft || aircraft.status !== "Active") continue;

    const homeState = aircraft.homeState?.toUpperCase();
    const fips = homeState ? ABBR_TO_FIPS[homeState] : undefined;
    if (!fips) continue;

    const bucket = byFips.get(fips);
    if (!bucket) continue;

    bucket.activeCount += 1;

    const status = getAircraftStatus(flight.dueAt, now);
    if (status === "WARNING") bucket.alertCount += 1;
    if (isFlightInEmergency(flight)) {
      bucket.emergencyCount += 1;
      if (status !== "OVERDUE") bucket.alertCount += 1;
    } else if (status === "OVERDUE") {
      bucket.emergencyCount += 1;
      bucket.alertCount += 1;
    }
  }

  const zoneTotals: StateCountsModel["zoneTotals"] = {
    East: { activeCount: 0, alertCount: 0, emergencyCount: 0 },
    Central: { activeCount: 0, alertCount: 0, emergencyCount: 0 },
    West: { activeCount: 0, alertCount: 0, emergencyCount: 0 },
  };

  let totalActive = 0;
  for (const metrics of byFips.values()) {
    totalActive += metrics.activeCount;
    const zone = metrics.zone;
    zoneTotals[zone].activeCount += metrics.activeCount;
    zoneTotals[zone].alertCount += metrics.alertCount;
    zoneTotals[zone].emergencyCount += metrics.emergencyCount;
  }

  return { byFips, zoneTotals, totalActive };
}

export function stateCountsSignature(model: StateCountsModel): string {
  const parts: string[] = [String(model.totalActive)];
  for (const [fips, metrics] of model.byFips) {
    parts.push(`${fips}:${metrics.activeCount}:${metrics.alertCount}`);
  }
  return parts.join("|");
}

export function getStateAbbrsForZone(zone: MonitoringZone): Set<string> {
  const abbrs = new Set<string>();
  for (const [fips, abbr] of Object.entries(STATE_FIPS_TO_ABBR)) {
    if (getZoneForStateAbbr(abbr) === zone) abbrs.add(abbr);
  }
  return abbrs;
}

export function filterFlightsByZoneStates(
  activeFlights: ActiveFlight[],
  aircraftRegistry: Aircraft[],
  zone: MonitoringZone,
): ActiveFlight[] {
  const zoneAbbrs = getStateAbbrsForZone(zone);
  const registryById = new Map(aircraftRegistry.map((a) => [a.id, a]));

  return activeFlights.filter((flight) => {
    const aircraft = registryById.get(flight.aircraftId);
    if (!aircraft || aircraft.status !== "Active") return false;
    return zoneAbbrs.has(aircraft.homeState.toUpperCase());
  });
}
