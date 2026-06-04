import { createDefaultEmergencyChecklist } from "./emergency-checklist";
import {
  buildNotificationCompletions,
  normalizeNotificationContacts,
} from "./response-plan-notifications";
import {
  hasUniqueIncidentReportIds,
  hasUniqueIncidentReportNumbers,
} from "./incident-reports-registry";
import {
  getZoneForStateAbbr,
  isKnownStateAbbr,
} from "./monitoring-region-config";
import type {
  EmergencyAssessmentType,
  EmergencyChecklistActionItem,
  EmergencyChecklistState,
  EmergencyContactOutcome,
  EmergencyOutcomeType,
  EmergencyResponseActionKey,
  EmergencyUpdateLogEntry,
  EmergencyYesNo,
  IncidentAttachment,
  IncidentAuditEntry,
  IncidentEventType,
  IncidentReport,
  IncidentReportStatus,
  IncidentResponsePlanExecution,
  IncidentSeverity,
  MonitoringZone,
  ResponsePlanItemCompletion,
  ResponsePlanNotificationCompletion,
  ResponsePlanOverrides,
  ResponsePlanStep,
} from "./types";
import {
  EMERGENCY_ASSESSMENT_TYPES,
  EMERGENCY_OUTCOMES,
  EMERGENCY_RESPONSE_ACTIONS,
  INCIDENT_EVENT_TYPES,
  INCIDENT_REPORT_STATUSES,
  INCIDENT_SEVERITIES,
} from "./types";

export const INCIDENT_REPORTS_STORAGE_KEY = "sentinel-occ:incident-reports";

const ZONES: MonitoringZone[] = ["East", "Central", "West"];

function isEventType(value: unknown): value is IncidentEventType {
  if (typeof value !== "string") return false;
  if (value === "Mechanical Issue") return true;
  return INCIDENT_EVENT_TYPES.includes(value as IncidentEventType);
}

function migrateEventType(value: unknown): IncidentEventType {
  if (value === "Mechanical Issue") return "Mechanical Failure";
  if (
    typeof value === "string" &&
    INCIDENT_EVENT_TYPES.includes(value as IncidentEventType)
  ) {
    return value as IncidentEventType;
  }
  return "Incident";
}

function isStatus(value: unknown): value is IncidentReportStatus | "Draft" | "Under Review" {
  if (typeof value !== "string") return false;
  return (
    INCIDENT_REPORT_STATUSES.includes(value as IncidentReportStatus) ||
    value === "Draft" ||
    value === "Under Review"
  );
}

function migrateStatus(value: unknown): IncidentReportStatus {
  if (value === "Draft" || value === "Under Review") return "Open";
  if (
    typeof value === "string" &&
    INCIDENT_REPORT_STATUSES.includes(value as IncidentReportStatus)
  ) {
    return value as IncidentReportStatus;
  }
  return "Open";
}

function normalizeAuditLog(value: unknown): IncidentAuditEntry[] {
  if (!Array.isArray(value)) return [];
  const result: IncidentAuditEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.action !== "string" ||
      typeof row.userId !== "string" ||
      typeof row.userName !== "string" ||
      typeof row.timestamp !== "number"
    ) {
      continue;
    }
    result.push({
      id: row.id,
      action: row.action,
      userId: row.userId,
      userName: row.userName.trim(),
      timestamp: row.timestamp,
      details: typeof row.details === "string" ? row.details : undefined,
    });
  }
  return result;
}

function isSeverity(value: unknown): value is IncidentSeverity {
  return (
    typeof value === "string" &&
    INCIDENT_SEVERITIES.includes(value as IncidentSeverity)
  );
}

function normalizeAttachments(value: unknown): IncidentAttachment[] {
  if (!Array.isArray(value)) return [];
  const result: IncidentAttachment[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.fileName !== "string") {
      continue;
    }
    result.push({
      id: row.id,
      fileName: row.fileName.trim(),
      uploadedAt:
        typeof row.uploadedAt === "number" && Number.isFinite(row.uploadedAt)
          ? row.uploadedAt
          : Date.now(),
    });
  }
  return result;
}

function normalizeActionItem(value: unknown): EmergencyChecklistActionItem {
  if (!value || typeof value !== "object") {
    return {
      completed: false,
      completedAt: null,
      completedByUserId: "",
      completedByUserName: "",
      notes: "",
    };
  }
  const row = value as Record<string, unknown>;
  return {
    completed: row.completed === true,
    completedAt:
      typeof row.completedAt === "number" && Number.isFinite(row.completedAt)
        ? row.completedAt
        : null,
    completedByUserId:
      typeof row.completedByUserId === "string" ? row.completedByUserId : "",
    completedByUserName:
      typeof row.completedByUserName === "string"
        ? row.completedByUserName.trim()
        : "",
    notes: typeof row.notes === "string" ? row.notes : "",
  };
}

function normalizeUpdateLogEntry(value: unknown): EmergencyUpdateLogEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.timestamp !== "number" ||
    !Number.isFinite(row.timestamp) ||
    typeof row.userId !== "string" ||
    typeof row.userName !== "string" ||
    typeof row.entry !== "string"
  ) {
    return null;
  }
  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.userId,
    userName: row.userName.trim(),
    entry: row.entry.trim(),
  };
}

function normalizeEmergencyChecklist(value: unknown): EmergencyChecklistState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const assessment = row.assessment as Record<string, unknown> | undefined;
  const contacts = row.contacts as Record<string, unknown> | undefined;
  const outcome = row.outcome as Record<string, unknown> | undefined;
  const closeout = row.closeout as Record<string, unknown> | undefined;
  const responseActionsRaw = row.responseActions as
    | Record<string, unknown>
    | undefined;

  const emergencyType =
    typeof assessment?.emergencyType === "string" &&
    EMERGENCY_ASSESSMENT_TYPES.includes(
      assessment.emergencyType as EmergencyAssessmentType,
    )
      ? (assessment.emergencyType as EmergencyAssessmentType)
      : null;

  const comms =
    assessment?.communicationsEstablished === "Yes" ||
    assessment?.communicationsEstablished === "No"
      ? (assessment.communicationsEstablished as EmergencyYesNo)
      : null;

  const contactOutcome =
    contacts?.emergencyContact === "Contacted" ||
    contacts?.emergencyContact === "Left Message" ||
    contacts?.emergencyContact === "Unable to Reach"
      ? (contacts.emergencyContact as EmergencyContactOutcome)
      : null;

  const outcomeType =
    typeof outcome?.outcome === "string" &&
    EMERGENCY_OUTCOMES.includes(outcome.outcome as EmergencyOutcomeType)
      ? (outcome.outcome as EmergencyOutcomeType)
      : null;

  const responseActions = Object.fromEntries(
    EMERGENCY_RESPONSE_ACTIONS.map((key) => [
      key,
      normalizeActionItem(responseActionsRaw?.[key]),
    ]),
  ) as EmergencyChecklistState["responseActions"];

  const updateLog: EmergencyUpdateLogEntry[] = [];
  if (Array.isArray(row.updateLog)) {
    for (const entry of row.updateLog) {
      const normalized = normalizeUpdateLogEntry(entry);
      if (normalized) updateLog.push(normalized);
    }
  }

  return {
    currentStep:
      typeof row.currentStep === "number" &&
      row.currentStep >= 1 &&
      row.currentStep <= 7
        ? row.currentStep
        : 1,
    step1Acknowledged: row.step1Acknowledged === true,
    assessment: {
      communicationsEstablished: comms,
      emergencyType,
      aircraftStatusNotes:
        typeof assessment?.aircraftStatusNotes === "string"
          ? assessment.aircraftStatusNotes
          : "",
      lastKnownLocation:
        typeof assessment?.lastKnownLocation === "string"
          ? assessment.lastKnownLocation
          : "",
      completedAt:
        typeof assessment?.completedAt === "number" &&
        Number.isFinite(assessment.completedAt)
          ? assessment.completedAt
          : null,
    },
    contacts: {
      emergencyContact: contactOutcome,
      organizationDispatch: contacts?.organizationDispatch === true,
      supervisor: contacts?.supervisor === true,
      additionalNotes:
        typeof contacts?.additionalNotes === "string"
          ? contacts.additionalNotes
          : "",
      completedAt:
        typeof contacts?.completedAt === "number" &&
        Number.isFinite(contacts.completedAt)
          ? contacts.completedAt
          : null,
    },
    responseActions,
    updateLog,
    outcome: {
      outcome: outcomeType,
      severity: isSeverity(outcome?.severity) ? outcome.severity : null,
      summary: typeof outcome?.summary === "string" ? outcome.summary : "",
      completedAt:
        typeof outcome?.completedAt === "number" &&
        Number.isFinite(outcome.completedAt)
          ? outcome.completedAt
          : null,
    },
    closeout: {
      allNotifications: closeout?.allNotifications === true,
      finalNotes: closeout?.finalNotes === true,
      incidentSummary: closeout?.incidentSummary === true,
      supervisorReview: closeout?.supervisorReview === true,
      completedAt:
        typeof closeout?.completedAt === "number" &&
        Number.isFinite(closeout.completedAt)
          ? closeout.completedAt
          : null,
    },
  };
}

function normalizeResponsePlanExecution(
  value: unknown,
): IncidentResponsePlanExecution | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  if (
    typeof row.planId !== "string" ||
    typeof row.organizationId !== "string" ||
    typeof row.planName !== "string" ||
    typeof row.versionNumber !== "number" ||
    typeof row.declaredAt !== "number"
  ) {
    return undefined;
  }

  const steps: ResponsePlanStep[] = [];
  if (Array.isArray(row.steps)) {
    for (const entry of row.steps) {
      if (!entry || typeof entry !== "object") continue;
      const s = entry as Record<string, unknown>;
      if (typeof s.id !== "string" || typeof s.title !== "string") continue;
      const items = Array.isArray(s.items)
        ? s.items
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const i = item as Record<string, unknown>;
              if (typeof i.id !== "string" || typeof i.label !== "string") {
                return null;
              }
              return {
                id: i.id,
                label: String(i.label),
                type:
                  i.type === "notes" ||
                  i.type === "text" ||
                  i.type === "dropdown" ||
                  i.type === "yes_no"
                    ? i.type
                    : "checkbox",
                required: i.required !== false,
                options: Array.isArray(i.options)
                  ? i.options.filter((o): o is string => typeof o === "string")
                  : undefined,
              };
            })
            .filter(Boolean)
        : [];
      steps.push({
        id: s.id,
        title: String(s.title),
        order: typeof s.order === "number" ? s.order : 0,
        items: items as ResponsePlanStep["items"],
      });
    }
  }

  const itemCompletions: Record<string, ResponsePlanItemCompletion> = {};
  if (row.itemCompletions && typeof row.itemCompletions === "object") {
    for (const [key, entry] of Object.entries(
      row.itemCompletions as Record<string, unknown>,
    )) {
      if (!entry || typeof entry !== "object") continue;
      const c = entry as Record<string, unknown>;
      itemCompletions[key] = {
        itemId: typeof c.itemId === "string" ? c.itemId : key,
        completed: c.completed === true,
        completedAt:
          typeof c.completedAt === "number" ? c.completedAt : null,
        completedByUserId:
          typeof c.completedByUserId === "string" ? c.completedByUserId : "",
        completedByUserName:
          typeof c.completedByUserName === "string" ? c.completedByUserName : "",
        value: typeof c.value === "string" ? c.value : "",
      };
    }
  }

  const updateLog = normalizeUpdateLogArray(row.updateLog);
  const overrides = normalizePlanOverrides(row.overrides);
  const outcomeRow = row.outcome as Record<string, unknown> | undefined;

  const notificationCompletions: Record<string, ResponsePlanNotificationCompletion> =
    {};
  if (row.notificationCompletions && typeof row.notificationCompletions === "object") {
    for (const [key, entry] of Object.entries(
      row.notificationCompletions as Record<string, unknown>,
    )) {
      if (!entry || typeof entry !== "object") continue;
      const c = entry as Record<string, unknown>;
      const outcome =
        c.outcome === "Contacted" ||
        c.outcome === "Left Message" ||
        c.outcome === "Unable to Reach"
          ? c.outcome
          : null;
      notificationCompletions[key] = {
        contactId: typeof c.contactId === "string" ? c.contactId : key,
        outcome,
        completedAt:
          typeof c.completedAt === "number" ? c.completedAt : null,
        completedByUserId:
          typeof c.completedByUserId === "string" ? c.completedByUserId : "",
        completedByUserName:
          typeof c.completedByUserName === "string" ? c.completedByUserName : "",
      };
    }
  }

  const mergedNotificationCompletions = buildNotificationCompletions(
    overrides.notificationContacts,
    notificationCompletions,
  );

  const rawStepIndex =
    typeof row.currentStepIndex === "number" ? row.currentStepIndex : 0;
  const currentStepIndex = normalizeWorkflowStepIndex(rawStepIndex, steps.length);

  return {
    planId: row.planId,
    organizationId: row.organizationId,
    planName: row.planName,
    versionNumber: row.versionNumber,
    steps,
    overrides,
    declaredAt: row.declaredAt,
    currentStepIndex,
    itemCompletions,
    notificationCompletions: mergedNotificationCompletions,
    requiredInformation:
      row.requiredInformation && typeof row.requiredInformation === "object"
        ? Object.fromEntries(
            Object.entries(row.requiredInformation as Record<string, unknown>).map(
              ([k, v]) => [k, typeof v === "string" ? v : ""],
            ),
          )
        : {},
    updateLog,
    outcome: {
      outcome:
        typeof outcomeRow?.outcome === "string"
          ? (outcomeRow.outcome as IncidentResponsePlanExecution["outcome"]["outcome"])
          : null,
      severity: isSeverity(outcomeRow?.severity) ? outcomeRow.severity : null,
      summary:
        typeof outcomeRow?.summary === "string" ? outcomeRow.summary : "",
      completedAt:
        typeof outcomeRow?.completedAt === "number"
          ? outcomeRow.completedAt
          : null,
    },
    closedAt: typeof row.closedAt === "number" ? row.closedAt : null,
  };
}

function normalizeWorkflowStepIndex(
  rawIndex: number,
  stepCount: number,
): number {
  if (stepCount <= 0) return 0;
  // Legacy executions used index 0 for a synthetic "Emergency declared" step.
  if (rawIndex <= 0) return 0;
  return Math.min(rawIndex - 1, stepCount);
}

function normalizeUpdateLogArray(value: unknown): EmergencyUpdateLogEntry[] {
  if (!Array.isArray(value)) return [];
  const result: EmergencyUpdateLogEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.timestamp !== "number" ||
      typeof row.userId !== "string" ||
      typeof row.userName !== "string" ||
      typeof row.entry !== "string"
    ) {
      continue;
    }
    result.push({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.userId,
      userName: row.userName,
      entry: row.entry,
    });
  }
  return result;
}

function normalizePlanOverrides(value: unknown): ResponsePlanOverrides {
  const defaults: ResponsePlanOverrides = {
    notificationContacts: normalizeNotificationContacts(undefined),
    requiredInformation: {
      personsOnBoard: true,
      fuelRemaining: false,
      lastKnownCoordinates: true,
      medicalConcerns: false,
      missionType: false,
    },
  };
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  const r = row.requiredInformation as Record<string, unknown> | undefined;
  const contactsRaw =
    row.notificationContacts ?? row.notifications ?? undefined;
  return {
    notificationContacts: normalizeNotificationContacts(contactsRaw),
    requiredInformation: {
      personsOnBoard: r?.personsOnBoard !== false,
      fuelRemaining: r?.fuelRemaining === true,
      lastKnownCoordinates: r?.lastKnownCoordinates !== false,
      medicalConcerns: r?.medicalConcerns === true,
      missionType: r?.missionType === true,
    },
  };
}

function isZone(value: unknown): value is MonitoringZone {
  return typeof value === "string" && ZONES.includes(value as MonitoringZone);
}

function normalizeIncidentReport(value: unknown): IncidentReport | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    !row.id ||
    typeof row.reportNumber !== "string" ||
    !row.reportNumber ||
    typeof row.eventAt !== "number" ||
    !Number.isFinite(row.eventAt) ||
    typeof row.aircraftId !== "string" ||
    typeof row.tailNumber !== "string" ||
    (row.location !== undefined && typeof row.location !== "string") ||
    typeof row.state !== "string" ||
    !isZone(row.region) ||
    !isEventType(row.eventType) ||
    !isSeverity(row.severity) ||
    typeof row.description !== "string" ||
    (row.actionsTaken !== undefined && typeof row.actionsTaken !== "string") ||
    !isStatus(row.status) ||
    typeof row.createdByUserId !== "string" ||
    typeof row.createdByUserName !== "string" ||
    typeof row.createdAt !== "number" ||
    !Number.isFinite(row.createdAt) ||
    typeof row.updatedAt !== "number" ||
    !Number.isFinite(row.updatedAt)
  ) {
    return null;
  }

  const state = row.state.toUpperCase();
  const region = isKnownStateAbbr(state)
    ? (getZoneForStateAbbr(state) ?? (row.region as MonitoringZone))
    : (row.region as MonitoringZone);

  return {
    id: row.id,
    reportNumber: row.reportNumber.trim(),
    eventAt: row.eventAt,
    aircraftId: row.aircraftId,
    tailNumber: row.tailNumber.trim(),
    organizationId:
      typeof row.organizationId === "string" ? row.organizationId : "",
    organizationName:
      typeof row.organizationName === "string"
        ? row.organizationName.trim()
        : "",
    state,
    region,
    eventType: migrateEventType(row.eventType),
    severity: row.severity,
    description: row.description.trim(),
    actionsTaken:
      typeof row.actionsTaken === "string" ? row.actionsTaken.trim() : "",
    status: migrateStatus(row.status),
    attachments: normalizeAttachments(row.attachments),
    createdByUserId: row.createdByUserId,
    createdByUserName: row.createdByUserName.trim(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sourceFlightId:
      typeof row.sourceFlightId === "string" ? row.sourceFlightId : undefined,
    isEmergencyTrigger: row.isEmergencyTrigger === true,
    assignedOperatorName:
      typeof row.assignedOperatorName === "string"
        ? row.assignedOperatorName.trim()
        : row.createdByUserName.trim(),
    flightStartTime:
      typeof row.flightStartTime === "number" && Number.isFinite(row.flightStartTime)
        ? row.flightStartTime
        : row.eventAt,
    flightDurationMinutes:
      typeof row.flightDurationMinutes === "number" &&
      Number.isFinite(row.flightDurationMinutes)
        ? row.flightDurationMinutes
        : 0,
    location:
      typeof row.location === "string" ? row.location.trim() : "",
    lastKnownPosition:
      typeof row.lastKnownPosition === "string"
        ? row.lastKnownPosition.trim()
        : "",
    personsOnBoard:
      typeof row.personsOnBoard === "string" ? row.personsOnBoard.trim() : "",
    notificationsMade:
      typeof row.notificationsMade === "string"
        ? row.notificationsMade.trim()
        : "",
    additionalNotes:
      typeof row.additionalNotes === "string"
        ? row.additionalNotes.trim()
        : "",
    auditLog: normalizeAuditLog(row.auditLog),
    responsePlanExecution: normalizeResponsePlanExecution(row.responsePlanExecution),
    emergencyChecklist:
      row.responsePlanExecution
        ? undefined
        : normalizeEmergencyChecklist(row.emergencyChecklist) ??
          (row.isEmergencyTrigger === true
            ? createDefaultEmergencyChecklist()
            : undefined),
  };
}

export function parsePersistedIncidentReports(raw: string): IncidentReport[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const registry = parsed
      .map(normalizeIncidentReport)
      .filter((row): row is IncidentReport => row !== null);
    if (registry.length === 0 && parsed.length > 0) return null;
    if (!hasUniqueIncidentReportIds(registry)) return null;
    if (!hasUniqueIncidentReportNumbers(registry)) return null;
    return registry;
  } catch {
    return null;
  }
}

export function loadIncidentReportsFromStorage(): IncidentReport[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(INCIDENT_REPORTS_STORAGE_KEY);
  if (!raw) return null;
  return parsePersistedIncidentReports(raw);
}

export function saveIncidentReportsToStorage(reports: IncidentReport[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    INCIDENT_REPORTS_STORAGE_KEY,
    JSON.stringify(reports),
  );
}
