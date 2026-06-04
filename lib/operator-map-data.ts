import { formatCountdown, getAircraftStatus } from "./aircraft-status";
import { cloneAircraft } from "./aircraft-registry";
import { coordinatesForAircraft } from "./geo-coordinates";
import {
  buildOperatorProfiles,
  getOperatorsForZone,
  type OperatorMapProfile,
} from "./operator-assignments";
import {
  buildStateActiveCounts,
  type StateCountsModel,
} from "./state-aircraft-counts";
import {
  getStateAbbrForFips,
  getZoneForStateFips,
  STATE_FIPS_TO_ABBR,
} from "./us-state-zones";
import type { Aircraft } from "./types";
import { GEOGRAPHIC_ZONE_ORDER } from "./monitoring-zones";
import type {
  ActiveFlight,
  ArchivedFlight,
  AircraftStatus,
  IncidentReport,
  MonitoringZone,
  OccUser,
} from "./types";

export type MapAircraftMarker = {
  id: string;
  tailNumber: string;
  coordinates: [number, number];
  status: AircraftStatus;
  zone: MonitoringZone;
  operatorName: string;
  flightStatus: "en_route" | "warning" | "overdue";
};

export type StateMapAircraftRow = {
  id: string;
  tailNumber: string;
  organizationName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: AircraftStatus;
  dueCountdown: string;
};

export type StateMapInsight = {
  fips: string;
  abbr: string | null;
  zone: MonitoringZone;
  operators: OperatorMapProfile[];
  aircraft: StateMapAircraftRow[];
  /** Active in-flight aircraft in this state (home state). */
  aircraftCount: number;
  alertCount: number;
  emergencyCount: number;
  statusSummary: {
    enRoute: number;
    warning: number;
    overdue: number;
    landedToday: number;
  };
  fill: string;
  stroke: string;
};

export type ZoneMapSummary = {
  zone: MonitoringZone;
  operators: OperatorMapProfile[];
  aircraftCount: number;
  enRoute: number;
  warning: number;
  overdue: number;
};

export type OperationsMapModel = {
  operators: OperatorMapProfile[];
  markers: MapAircraftMarker[];
  stateCounts: StateCountsModel;
  stateInsights: Map<string, StateMapInsight>;
  zoneSummaries: ZoneMapSummary[];
};

export const ZONE_MAP_STYLES: Record<
  MonitoringZone,
  { fill: string; stroke: string; glow: string }
> = {
  East: {
    fill: "rgba(34, 211, 238, 0.22)",
    stroke: "rgba(34, 211, 238, 0.85)",
    glow: "#22d3ee",
  },
  Central: {
    fill: "rgba(251, 191, 36, 0.22)",
    stroke: "rgba(251, 191, 36, 0.85)",
    glow: "#fbbf24",
  },
  West: {
    fill: "rgba(52, 211, 153, 0.22)",
    stroke: "rgba(52, 211, 153, 0.85)",
    glow: "#34d399",
  },
};

function blendZoneFill(
  zones: MonitoringZone[],
  operatorCount: number,
): { fill: string; stroke: string } {
  if (zones.length === 0) {
    return { fill: "rgba(15, 23, 42, 0.6)", stroke: "rgba(51, 65, 85, 0.5)" };
  }

  const primary = ZONE_MAP_STYLES[zones[0]];
  const opacityBoost = Math.min(0.18, operatorCount * 0.04);
  return {
    fill: primary.fill.replace("0.22", String(0.22 + opacityBoost)),
    stroke: primary.stroke,
  };
}

function isToday(timestamp: number, now: number): boolean {
  const day = new Date(timestamp);
  const current = new Date(now);
  return (
    day.getFullYear() === current.getFullYear() &&
    day.getMonth() === current.getMonth() &&
    day.getDate() === current.getDate()
  );
}

function countFillOpacity(activeCount: number): string {
  if (activeCount <= 0) return "0.22";
  if (activeCount <= 2) return "0.28";
  if (activeCount <= 5) return "0.34";
  return "0.42";
}

export function buildOperationsMapModel(
  users: OccUser[],
  activeFlights: ActiveFlight[],
  archivedFlights: ArchivedFlight[],
  aircraftRegistry: Aircraft[],
  now: number,
  incidentReports: IncidentReport[] = [],
): OperationsMapModel {
  const operators = buildOperatorProfiles(users);
  const stateCounts = buildStateActiveCounts(
    activeFlights,
    aircraftRegistry,
    now,
  );

  const markers: MapAircraftMarker[] = activeFlights.map((flight) => {
    const status = getAircraftStatus(flight.dueAt, now);
    const zoneOperators = getOperatorsForZone(operators, flight.monitoringZone);
    const primaryOperator =
      zoneOperators[0]?.name ?? flight.organizationName?.trim() ?? "";

    return {
      id: flight.id,
      tailNumber: flight.tailNumber,
      coordinates: coordinatesForAircraft(flight.aircraftId, flight.monitoringZone),
      status,
      zone: flight.monitoringZone,
      operatorName: primaryOperator,
      flightStatus:
        status === "OVERDUE"
          ? "overdue"
          : status === "WARNING"
            ? "warning"
            : "en_route",
    };
  });

  const zoneSummaries: ZoneMapSummary[] = GEOGRAPHIC_ZONE_ORDER.map((zone) => {
    const totals = stateCounts.zoneTotals[zone];
    let warning = 0;
    let overdue = 0;
    for (const metrics of stateCounts.byFips.values()) {
      if (metrics.zone !== zone) continue;
      overdue += metrics.emergencyCount;
      warning += Math.max(0, metrics.alertCount - metrics.emergencyCount);
    }

    return {
      zone,
      operators: getOperatorsForZone(operators, zone),
      aircraftCount: totals.activeCount,
      enRoute: Math.max(0, totals.activeCount - totals.alertCount),
      warning,
      overdue,
    };
  });

  const registryById = new Map(aircraftRegistry.map((a) => [a.id, a]));
  const stateInsights = new Map<string, StateMapInsight>();

  for (const [fips, metrics] of stateCounts.byFips) {
    const zone = metrics.zone;
    const zoneOperators = getOperatorsForZone(operators, zone);
    const landedToday = archivedFlights.filter((f) => {
      const abbr = getStateAbbrForFips(fips);
      return (
        abbr !== null &&
        f.monitoringZone === zone &&
        isToday(f.landingTime, now)
      );
    }).length;

    const visuals = blendZoneFill(
      [zone],
      zoneOperators.length,
    );
    const fillOpacity = countFillOpacity(metrics.activeCount);
    const fill =
      metrics.emergencyCount > 0
        ? "rgba(239, 68, 68, 0.48)"
        : visuals.fill.replace("0.22", fillOpacity);
    const stroke =
      metrics.emergencyCount > 0
        ? "rgba(248, 113, 113, 0.95)"
        : visuals.stroke;

    const stateAbbr = metrics.abbr;
    const stateAircraftRows: StateMapAircraftRow[] = activeFlights
      .filter((flight) => {
        const aircraft = registryById.get(flight.aircraftId);
        return (
          aircraft?.status === "Active" &&
          stateAbbr !== null &&
          aircraft.homeState.toUpperCase() === stateAbbr
        );
      })
      .map((flight) => {
        const aircraft = registryById.get(flight.aircraftId)!;
        const snapshot = cloneAircraft(aircraft);
        const status = getAircraftStatus(flight.dueAt, now);
        return {
          id: flight.id,
          tailNumber: flight.tailNumber,
          organizationName: snapshot.organizationName?.trim() || "",
          emergencyContactName: snapshot.emergencyContactName,
          emergencyContactPhone: snapshot.emergencyContactPhone,
          status,
          dueCountdown: formatCountdown(flight.dueAt, now),
        };
      })
      .sort((a, b) => a.tailNumber.localeCompare(b.tailNumber));

    stateInsights.set(fips, {
      fips,
      abbr: metrics.abbr,
      zone,
      operators: zoneOperators,
      aircraft: stateAircraftRows,
      aircraftCount: metrics.activeCount,
      alertCount: metrics.alertCount,
      emergencyCount: metrics.emergencyCount,
      statusSummary: {
        enRoute: Math.max(0, metrics.activeCount - metrics.alertCount),
        warning: Math.max(0, metrics.alertCount - metrics.emergencyCount),
        overdue: metrics.emergencyCount,
        landedToday,
      },
      fill,
      stroke,
    });
  }

  return { operators, markers, stateCounts, stateInsights, zoneSummaries };
}
