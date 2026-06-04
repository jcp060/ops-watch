import { generateIncidentReportNumber } from "./incident-report-number";
import { getZoneForStateAbbr, isKnownStateAbbr } from "./monitoring-region-config";
import type { Aircraft, IncidentReport } from "./types";

export type IncidentReportSaveResult =
  | { ok: true; report: IncidentReport }
  | { ok: false; message: string };

export function validateIncidentReportForSave(
  report: IncidentReport,
  existing: IncidentReport[],
  mode: "create" | "edit",
): IncidentReportSaveResult {
  if (!report.id?.trim()) {
    return { ok: false, message: "Report id is missing." };
  }

  if (!report.aircraftId?.trim()) {
    return { ok: false, message: "Select an aircraft." };
  }

  if (!report.tailNumber?.trim()) {
    return { ok: false, message: "Aircraft tail number is required." };
  }

  if (!report.isEmergencyTrigger && !report.location?.trim()) {
    return { ok: false, message: "Location is required." };
  }

  if (!report.state || !isKnownStateAbbr(report.state)) {
    return { ok: false, message: "Select a valid state." };
  }

  const zone = getZoneForStateAbbr(report.state);
  if (!zone) {
    return { ok: false, message: "Could not resolve monitoring region for state." };
  }

  if (!report.description?.trim()) {
    return { ok: false, message: "Description is required." };
  }

  if (
    typeof report.eventAt !== "number" ||
    !Number.isFinite(report.eventAt)
  ) {
    return { ok: false, message: "Event date and time are required." };
  }

  const reportNumber =
    mode === "create" && !report.reportNumber?.trim()
      ? generateIncidentReportNumber(existing, report.eventAt)
      : report.reportNumber.trim();

  if (!reportNumber) {
    return { ok: false, message: "Report number is required." };
  }

  const duplicateNumber = existing.some(
    (r) => r.reportNumber === reportNumber && r.id !== report.id,
  );
  if (duplicateNumber) {
    return { ok: false, message: "Report number already exists." };
  }

  if (mode === "create" && existing.some((r) => r.id === report.id)) {
    return { ok: false, message: "A report with this id already exists." };
  }

  const normalized: IncidentReport = {
    ...report,
    reportNumber,
    tailNumber: report.tailNumber.trim().toUpperCase(),
    organizationId: (report.organizationId ?? "").trim(),
    organizationName: (report.organizationName ?? "").trim(),
    location: (report.location ?? "").trim(),
    state: report.state.toUpperCase(),
    region: zone,
    description: report.description.trim(),
    actionsTaken: (report.actionsTaken ?? "").trim(),
    lastKnownPosition: (report.lastKnownPosition ?? "").trim(),
    personsOnBoard: (report.personsOnBoard ?? "").trim(),
    notificationsMade: (report.notificationsMade ?? "").trim(),
    additionalNotes: (report.additionalNotes ?? "").trim(),
    assignedOperatorName: (report.assignedOperatorName ?? "").trim(),
    flightStartTime: report.flightStartTime ?? report.eventAt,
    flightDurationMinutes: report.flightDurationMinutes ?? 0,
    isEmergencyTrigger: report.isEmergencyTrigger ?? false,
    emergencyChecklist: report.emergencyChecklist,
    responsePlanExecution: report.responsePlanExecution,
    auditLog: report.auditLog ?? [],
    attachments: report.attachments ?? [],
    updatedAt: Date.now(),
  };

  return { ok: true, report: normalized };
}

export function aircraftFieldsForIncident(
  aircraft: Aircraft,
): Pick<
  IncidentReport,
  | "aircraftId"
  | "tailNumber"
  | "organizationId"
  | "organizationName"
  | "state"
  | "region"
> {
  return {
    aircraftId: aircraft.id,
    tailNumber: aircraft.tailNumber,
    organizationId: aircraft.organizationId,
    organizationName: aircraft.organizationName,
    state: aircraft.homeState,
    region: aircraft.monitoringZone,
  };
}
