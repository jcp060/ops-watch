import { getAircraftStatus, formatCountdown, formatLastVerified } from "./aircraft-status";
import { isFlightInEmergency } from "./emergency-workflow";
import {
  buildOperatorProfiles,
  getOperatorsForZone,
  type OperatorMapProfile,
} from "./operator-assignments";
import { GEOGRAPHIC_ZONE_ORDER } from "./monitoring-zones";
import {
  buildStateActiveCounts,
  filterFlightsByZoneStates,
} from "./state-aircraft-counts";
import type { Aircraft } from "./types";
import type {
  ActiveFlight,
  AircraftStatus,
  ArchivedFlight,
  MonitoringZone,
  OccUser,
  VerificationOutcome,
  VerificationRecord,
  IncidentReport,
} from "./types";
import { countActiveEmergencyIncidents } from "./emergency-workflow";

export type RegionSeverity = "normal" | "caution" | "alert" | "monitoring";

export type RegionMapEvent = {
  id: string;
  timestamp: number;
  label: string;
  outcome: VerificationOutcome;
  tailNumber: string;
  severity: "info" | "caution" | "alert";
};

export type RegionAircraftRow = {
  id: string;
  tailNumber: string;
  organizationName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: AircraftStatus;
  statusLabel: string;
  dueCountdown: string;
  lastVerified: string;
};

export type RegionLiveStats = {
  zone: MonitoringZone;
  totalAircraft: number;
  enRoute: number;
  landed: number;
  delayed: number;
  emergency: number;
  weatherHolds: number;
  monitored: number;
  severity: RegionSeverity;
  operators: OperatorMapProfile[];
  supervisors: OperatorMapProfile[];
  aircraft: RegionAircraftRow[];
  recentEvents: RegionMapEvent[];
  departuresToday: number;
  arrivalsToday: number;
  workloadPerOperator: number;
};

export type CommandMapSummary = {
  totalActiveAircraft: number;
  regionsMonitored: number;
  activeAlerts: number;
  activeEmergencies: number;
  supervisorsOnline: number;
  operatorsOnline: number;
};

export type CommandMapStats = {
  summary: CommandMapSummary;
  regions: Record<MonitoringZone, RegionLiveStats>;
};

const EVENT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

function isToday(timestamp: number, now: number): boolean {
  const day = new Date(timestamp);
  const current = new Date(now);
  return (
    day.getFullYear() === current.getFullYear() &&
    day.getMonth() === current.getMonth() &&
    day.getDate() === current.getDate()
  );
}

/** Monitoring region for a flight (assigned zone from registry / session). */
export function regionForFlight(flight: ActiveFlight): MonitoringZone {
  return flight.monitoringZone;
}

function latestVerification(
  history: VerificationRecord[],
): VerificationRecord | null {
  if (history.length === 0) return null;
  return history.reduce((latest, record) =>
    record.timestamp > latest.timestamp ? record : latest,
  );
}

function eventSeverity(
  outcome: VerificationOutcome,
  status: AircraftStatus,
): RegionMapEvent["severity"] {
  if (outcome === "Emergency" || status === "OVERDUE") return "alert";
  if (
    outcome === "Delayed Check-In" ||
    outcome === "Maintenance Issue" ||
    status === "WARNING"
  ) {
    return "caution";
  }
  return "info";
}

function statusLabel(status: AircraftStatus): string {
  if (status === "OVERDUE") return "Emergency / Alert";
  if (status === "WARNING") return "Delayed";
  return "En Route";
}

function resolveRegionSeverity(
  emergency: number,
  delayed: number,
  monitored: number,
): RegionSeverity {
  if (emergency > 0) return "alert";
  if (delayed > 0) return "caution";
  if (monitored > 0) return "monitoring";
  return "normal";
}

function collectRecentEvents(
  flights: ActiveFlight[],
  now: number,
): RegionMapEvent[] {
  const cutoff = now - EVENT_LOOKBACK_MS;
  const events: RegionMapEvent[] = [];

  for (const flight of flights) {
    const status = getAircraftStatus(flight.dueAt, now);
    for (const record of flight.verificationHistory) {
      if (record.timestamp < cutoff) continue;
      events.push({
        id: record.id,
        timestamp: record.timestamp,
        label: record.employeeAction,
        outcome: record.outcome,
        tailNumber: flight.tailNumber,
        severity: eventSeverity(record.outcome, status),
      });
    }
  }

  return events
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
}

function buildRegionStats(
  zone: MonitoringZone,
  operators: OperatorMapProfile[],
  activeFlights: ActiveFlight[],
  archivedFlights: ArchivedFlight[],
  aircraftRegistry: Aircraft[],
  stateCounts: ReturnType<typeof buildStateActiveCounts>,
  now: number,
): RegionLiveStats {
  const zoneFlights = filterFlightsByZoneStates(
    activeFlights,
    aircraftRegistry,
    zone,
  );
  const zoneTotals = stateCounts.zoneTotals[zone];

  let enRoute = 0;
  let delayed = 0;
  let emergency = 0;
  let weatherHolds = 0;

  const registryById = new Map(aircraftRegistry.map((a) => [a.id, a]));

  const aircraftRows: RegionAircraftRow[] = zoneFlights.map((flight) => {
    const status = getAircraftStatus(flight.dueAt, now);
    const latest = latestVerification(flight.verificationHistory);
    const registry = registryById.get(flight.aircraftId);

    if (isFlightInEmergency(flight)) {
      emergency += 1;
    } else if (status === "OVERDUE") {
      emergency += 1;
    } else if (status === "WARNING") {
      delayed += 1;
    } else if (status === "ACTIVE") {
      enRoute += 1;
    }

    if (
      latest?.outcome === "Delayed Check-In" &&
      status !== "WARNING" &&
      status !== "OVERDUE"
    ) {
      delayed += 1;
      weatherHolds += 1;
    }
    if (latest?.outcome === "Maintenance Issue") {
      weatherHolds += 1;
    }

    return {
      id: flight.id,
      tailNumber: flight.tailNumber,
      organizationName:
        registry?.organizationName?.trim() ||
        flight.organizationName?.trim() ||
        "",
      emergencyContactName: registry?.emergencyContactName ?? "",
      emergencyContactPhone: registry?.emergencyContactPhone ?? "",
      status,
      statusLabel: statusLabel(status),
      dueCountdown: formatCountdown(flight.dueAt, now),
      lastVerified: formatLastVerified(flight.lastVerifiedAt, now),
    };
  });

  const landed = archivedFlights.filter(
    (flight) =>
      flight.monitoringZone === zone && isToday(flight.landingTime, now),
  ).length;

  const departuresToday = zoneFlights.filter((flight) =>
    isToday(flight.flightStartTime, now),
  ).length;

  const zoneOperators = getOperatorsForZone(operators, zone);
  const supervisors = zoneOperators.filter(
    (operator) => operator.role === "Supervisor" || operator.role === "Admin",
  );

  const monitored = zoneTotals.activeCount;
  const totalAircraft = monitored + landed;

  return {
    zone,
    totalAircraft,
    enRoute,
    landed,
    delayed,
    emergency,
    weatherHolds,
    monitored,
    severity: resolveRegionSeverity(emergency, delayed, monitored),
    operators: zoneOperators,
    supervisors,
    aircraft: aircraftRows.sort((a, b) => {
      const order: Record<AircraftStatus, number> = {
        OVERDUE: 0,
        WARNING: 1,
        ACTIVE: 2,
      };
      return order[a.status] - order[b.status];
    }),
    recentEvents: collectRecentEvents(zoneFlights, now),
    departuresToday,
    arrivalsToday: landed,
    workloadPerOperator:
      zoneOperators.length > 0
        ? Math.round((monitored / zoneOperators.length) * 10) / 10
        : monitored,
  };
}

export function buildCommandMapStats(
  users: OccUser[],
  activeFlights: ActiveFlight[],
  archivedFlights: ArchivedFlight[],
  aircraftRegistry: Aircraft[],
  now: number,
  incidentReports: IncidentReport[] = [],
): CommandMapStats {
  const operators = buildOperatorProfiles(users);
  const stateCounts = buildStateActiveCounts(
    activeFlights,
    aircraftRegistry,
    now,
  );

  const regions = {} as Record<MonitoringZone, RegionLiveStats>;
  for (const zone of GEOGRAPHIC_ZONE_ORDER) {
    regions[zone] = buildRegionStats(
      zone,
      operators,
      activeFlights,
      archivedFlights,
      aircraftRegistry,
      stateCounts,
      now,
    );
  }

  let activeAlerts = 0;
  let regionsMonitored = 0;
  for (const zone of GEOGRAPHIC_ZONE_ORDER) {
    const stats = regions[zone];
    const totals = stateCounts.zoneTotals[zone];
    activeAlerts += totals.alertCount;
    if (stats.operators.length > 0 || totals.activeCount > 0) {
      regionsMonitored += 1;
    }
  }

  const supervisorsOnline = users.filter(
    (user) =>
      user.status === "Active" &&
      (user.role === "Supervisor" || user.role === "Admin"),
  ).length;

  const operatorsOnline = users.filter(
    (user) => user.status === "Active" && user.role === "OCC Operator",
  ).length;

  const activeEmergencies = countActiveEmergencyIncidents(incidentReports);

  return {
    summary: {
      totalActiveAircraft: stateCounts.totalActive,
      regionsMonitored,
      activeAlerts,
      activeEmergencies,
      supervisorsOnline,
      operatorsOnline,
    },
    regions,
  };
}

/** Shallow compare for memoized region overlay updates. */
export function regionStatsSignature(stats: RegionLiveStats): string {
  return [
    stats.totalAircraft,
    stats.enRoute,
    stats.landed,
    stats.delayed,
    stats.emergency,
    stats.weatherHolds,
    stats.monitored,
    stats.severity,
    stats.aircraft.length,
    stats.recentEvents.length,
  ].join("|");
}
