import type {
  ActiveFlight,
  ActiveFlightSession,
  Aircraft,
  IncidentAuditEntry,
  IncidentReport,
  IncidentReportStatus,
  OccUser,
  VerificationRecord,
} from "./types";
import { TERMINAL_INCIDENT_STATUSES } from "./types";
import { generateIncidentReportNumber } from "./incident-report-number";
import { emergencyResponsePath } from "./emergency-routes";
import { createExecutionFromPlanVersion, getCurrentPlanVersion } from "./response-plan-execution";
import {
  getIncidentReportsSnapshot,
  persistIncidentReportsNow,
} from "@/stores/incident-reports-store";
import {
  getOrCreateResponsePlanForOrganization,
  persistResponsePlansNow,
} from "@/stores/response-plans-store";
import { getZoneForStateAbbr } from "./monitoring-region-config";
import { createUniqueId } from "./unique-id";

export function latestVerificationRecord(
  history: VerificationRecord[],
): VerificationRecord | null {
  if (history.length === 0) return null;
  return history.reduce((latest, record) =>
    record.timestamp > latest.timestamp ? record : latest,
  );
}

export function isFlightInEmergency(
  session: Pick<
    ActiveFlightSession,
    "emergencyDeclaredAt" | "verificationHistory"
  >,
): boolean {
  if (session.emergencyDeclaredAt != null && session.emergencyDeclaredAt > 0) {
    return true;
  }
  return latestVerificationRecord(session.verificationHistory)?.outcome === "Emergency";
}

export function isActiveEmergencyIncident(report: IncidentReport): boolean {
  if (!report.isEmergencyTrigger) return false;
  return !TERMINAL_INCIDENT_STATUSES.includes(report.status);
}

export function countActiveEmergencyIncidents(reports: IncidentReport[]): number {
  return reports.filter(isActiveEmergencyIncident).length;
}

export function isTerminalIncidentStatus(status: IncidentReportStatus): boolean {
  return TERMINAL_INCIDENT_STATUSES.includes(status);
}

export function createIncidentAuditEntry(
  action: string,
  user: Pick<OccUser, "id" | "name">,
  details?: string,
  timestamp = Date.now(),
): IncidentAuditEntry {
  return {
    id: createUniqueId(),
    action,
    userId: user.id,
    userName: user.name,
    timestamp,
    details,
  };
}

export type BuildEmergencyIncidentInput = {
  flight: ActiveFlight;
  aircraft: Aircraft;
  user: Pick<OccUser, "id" | "name">;
  checkInNotes: string;
  verifiedAt: number;
  existingReports: IncidentReport[];
};

export function buildEmergencyIncidentDraft(
  input: BuildEmergencyIncidentInput,
): IncidentReport {
  const {
    flight,
    aircraft,
    user,
    checkInNotes,
    verifiedAt,
    existingReports,
  } = input;

  const id = `ir-em-${createUniqueId()}`;
  const reportNumber = generateIncidentReportNumber(existingReports, verifiedAt);
  const zone =
    getZoneForStateAbbr(aircraft.homeState) ?? aircraft.monitoringZone;
  const durationMinutes = Math.max(
    0,
    Math.floor((verifiedAt - flight.flightStartTime) / 60_000),
  );

  const auditLog: IncidentAuditEntry[] = [
    createIncidentAuditEntry(
      "Emergency declared",
      user,
      `Report ${reportNumber} · ${flight.tailNumber}`,
      verifiedAt,
    ),
  ];

  const orgPlan = getOrCreateResponsePlanForOrganization(
    aircraft.organizationId,
    aircraft.organizationName,
    user,
  );
  const planVersion = getCurrentPlanVersion(orgPlan);
  if (!planVersion) {
    throw new Error("Unable to load organization response plan.");
  }

  auditLog.push(
    createIncidentAuditEntry(
      "Organization response plan loaded",
      user,
      `${planVersion.planName} (v${planVersion.versionNumber})`,
      verifiedAt,
    ),
  );

  const responsePlanExecution = createExecutionFromPlanVersion(
    orgPlan,
    planVersion,
    verifiedAt,
  );

  return {
    id,
    reportNumber,
    eventAt: verifiedAt,
    aircraftId: aircraft.id,
    tailNumber: aircraft.tailNumber,
    organizationId: aircraft.organizationId,
    organizationName: aircraft.organizationName,
    location: "",
    state: aircraft.homeState,
    region: zone,
    eventType: "Incident",
    severity: "Critical",
    description: checkInNotes.trim() || "Emergency declared during aircraft check-in.",
    actionsTaken: "",
    status: "Open",
    attachments: [],
    createdByUserId: user.id,
    createdByUserName: user.name,
    createdAt: verifiedAt,
    updatedAt: verifiedAt,
    sourceFlightId: flight.id,
    isEmergencyTrigger: true,
    assignedOperatorName: user.name,
    flightStartTime: flight.flightStartTime,
    flightDurationMinutes: durationMinutes,
    lastKnownPosition: "",
    personsOnBoard: "",
    notificationsMade: "",
    additionalNotes: "",
    auditLog,
    responsePlanExecution,
  };
}

export function openEmergencyResponseTab(incidentId: string): {
  opened: boolean;
  path?: string;
  error?: string;
} {
  if (typeof window === "undefined") {
    return { opened: false, error: "Emergency tab can only open in the browser." };
  }

  const trimmedId = incidentId.trim();
  if (!trimmedId) {
    return { opened: false, error: "Incident id is missing." };
  }

  persistIncidentReportsNow();
  persistResponsePlansNow();

  const incident = getIncidentReportsSnapshot().find(
    (report) => report.id === trimmedId,
  );
  if (!incident) {
    return {
      opened: false,
      error: `Incident "${trimmedId}" was not found after save. Refresh and check Reports > Accidents & Incidents.`,
    };
  }

  if (!incident.responsePlanExecution) {
    return {
      opened: false,
      error: "Incident was saved without a response plan execution snapshot.",
    };
  }

  const path = emergencyResponsePath(trimmedId);
  const tab = window.open(path, "_blank", "noopener,noreferrer");
  if (!tab) {
    return {
      opened: false,
      path,
      error:
        "Unable to open a new tab. Allow pop-ups for this site, or open the incident from Reports > Accidents & Incidents.",
    };
  }

  return { opened: true, path };
}

/** @deprecated Use openEmergencyResponseTab */
export function openEmergencyReportTab(incidentId: string): void {
  openEmergencyResponseTab(incidentId);
}
