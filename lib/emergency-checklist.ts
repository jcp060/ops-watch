import { createIncidentAuditEntry } from "./emergency-workflow";
import type {
  EmergencyChecklistState,
  EmergencyResponseActionKey,
  IncidentEventType,
  IncidentReport,
  IncidentReportStatus,
  OccUser,
} from "./types";
import {
  EMERGENCY_ASSESSMENT_TYPES,
  EMERGENCY_OUTCOMES,
  EMERGENCY_RESPONSE_ACTIONS,
  EMERGENCY_RESPONSE_STEPS,
} from "./types";

export function createDefaultEmergencyChecklist(): EmergencyChecklistState {
  const emptyAction = () => ({
    completed: false,
    completedAt: null,
    completedByUserId: "",
    completedByUserName: "",
    notes: "",
  });

  return {
    currentStep: 1,
    step1Acknowledged: false,
    assessment: {
      communicationsEstablished: null,
      emergencyType: null,
      aircraftStatusNotes: "",
      lastKnownLocation: "",
      completedAt: null,
    },
    contacts: {
      emergencyContact: null,
      organizationDispatch: false,
      supervisor: false,
      additionalNotes: "",
      completedAt: null,
    },
    responseActions: Object.fromEntries(
      EMERGENCY_RESPONSE_ACTIONS.map((key) => [key, emptyAction()]),
    ) as EmergencyChecklistState["responseActions"],
    updateLog: [],
    outcome: {
      outcome: null,
      severity: null,
      summary: "",
      completedAt: null,
    },
    closeout: {
      allNotifications: false,
      finalNotes: false,
      incidentSummary: false,
      supervisorReview: false,
      completedAt: null,
    },
  };
}

export function mapAssessmentTypeToEventType(
  type: EmergencyChecklistState["assessment"]["emergencyType"],
): IncidentEventType {
  switch (type) {
    case "Mechanical":
      return "Mechanical Failure";
    case "Medical":
      return "Medical Emergency";
    case "Fuel":
      return "Fuel Emergency";
    case "Weather":
      return "Weather Event";
    case "Lost Communications":
      return "Lost Communications";
    case "Accident":
      return "Accident";
    case "Unknown":
      return "Incident";
    case "Other":
      return "Other";
    default:
      return "Incident";
  }
}

function isAssessmentComplete(
  assessment: EmergencyChecklistState["assessment"],
): boolean {
  return (
    assessment.communicationsEstablished !== null &&
    assessment.emergencyType !== null &&
    EMERGENCY_ASSESSMENT_TYPES.includes(assessment.emergencyType) &&
    assessment.aircraftStatusNotes.trim().length > 0 &&
    assessment.lastKnownLocation.trim().length > 0
  );
}

function isContactsComplete(contacts: EmergencyChecklistState["contacts"]): boolean {
  return (
    contacts.emergencyContact !== null &&
    contacts.organizationDispatch &&
    contacts.supervisor
  );
}

function isResponseActionsComplete(
  actions: EmergencyChecklistState["responseActions"],
): boolean {
  return EMERGENCY_RESPONSE_ACTIONS.every((key) => actions[key].completed);
}

function isOutcomeComplete(outcome: EmergencyChecklistState["outcome"]): boolean {
  return (
    outcome.outcome !== null &&
    outcome.severity !== null &&
    outcome.summary.trim().length > 0
  );
}

function isCloseoutComplete(closeout: EmergencyChecklistState["closeout"]): boolean {
  return (
    closeout.allNotifications &&
    closeout.finalNotes &&
    closeout.incidentSummary &&
    closeout.supervisorReview
  );
}

export function isStepComplete(
  step: number,
  checklist: EmergencyChecklistState,
): boolean {
  switch (step) {
    case 1:
      return checklist.step1Acknowledged;
    case 2:
      return isAssessmentComplete(checklist.assessment);
    case 3:
      return isContactsComplete(checklist.contacts);
    case 4:
      return isResponseActionsComplete(checklist.responseActions);
    case 5:
      return checklist.updateLog.length > 0;
    case 6:
      return isOutcomeComplete(checklist.outcome);
    case 7:
      return isCloseoutComplete(checklist.closeout);
    default:
      return false;
  }
}

export function canAdvanceFromStep(
  step: number,
  checklist: EmergencyChecklistState,
): boolean {
  if (step === 1 || step === 5) return true;
  return isStepComplete(step, checklist);
}

export function calculateChecklistProgress(
  checklist: EmergencyChecklistState,
): number {
  const completed = EMERGENCY_RESPONSE_STEPS.filter((step) =>
    isStepComplete(step.id, checklist),
  ).length;
  return Math.round((completed / EMERGENCY_RESPONSE_STEPS.length) * 100);
}

function formatUpdateLog(entries: EmergencyChecklistState["updateLog"]): string {
  if (entries.length === 0) return "";
  return entries
    .map((entry) => {
      const time = new Date(entry.timestamp).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${time} — ${entry.userName}: ${entry.entry}`;
    })
    .join("\n");
}

function formatResponseActions(
  actions: EmergencyChecklistState["responseActions"],
): string {
  return EMERGENCY_RESPONSE_ACTIONS.filter((key) => actions[key].completed)
    .map((key) => {
      const item = actions[key];
      const label = actionLabel(key);
      const time = item.completedAt
        ? new Date(item.completedAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      const notes = item.notes.trim();
      return notes
        ? `${label} (${time}, ${item.completedByUserName}): ${notes}`
        : `${label} (${time}, ${item.completedByUserName})`;
    })
    .join("\n");
}

export function actionLabel(key: EmergencyResponseActionKey): string {
  const labels: Record<EmergencyResponseActionKey, string> = {
    emergencyServices: "Emergency services contacted",
    searchAndRescue: "Search and rescue initiated",
    localAuthorities: "Local authorities notified",
    landingFacility: "Landing facility contacted",
    situationUpdates: "Situation updates documented",
  };
  return labels[key];
}

export function syncIncidentReportFromChecklist(
  report: IncidentReport,
  checklist: EmergencyChecklistState,
  user: Pick<OccUser, "id" | "name">,
  closing = false,
): IncidentReport {
  const { assessment, contacts, outcome } = checklist;
  const now = Date.now();

  let status: IncidentReportStatus = "Active Response";
  if (checklist.currentStep >= 5) status = "Monitoring";
  if (closing) status = "Closed";

  const descriptionParts = [
    "=== EMERGENCY RESPONSE CHECKLIST ===",
    "",
    "INITIAL ASSESSMENT",
    `Communications established: ${assessment.communicationsEstablished ?? "—"}`,
    `Emergency type: ${assessment.emergencyType ?? "—"}`,
    `Aircraft status: ${assessment.aircraftStatusNotes.trim() || "—"}`,
    `Last known location: ${assessment.lastKnownLocation.trim() || "—"}`,
    "",
    "ONGOING UPDATES",
    formatUpdateLog(checklist.updateLog) || "—",
    "",
    "EVENT OUTCOME",
    `Outcome: ${outcome.outcome ?? "—"}`,
    `Summary: ${outcome.summary.trim() || "—"}`,
  ];

  const notificationsParts = [
    contacts.emergencyContact
      ? `Org emergency contact: ${contacts.emergencyContact}`
      : null,
    contacts.organizationDispatch ? "Organization dispatch notified" : null,
    contacts.supervisor ? "Supervisor notified" : null,
    contacts.additionalNotes.trim() || null,
  ].filter(Boolean);

  return {
    ...report,
    location: assessment.lastKnownLocation.trim() || report.location,
    lastKnownPosition: assessment.lastKnownLocation.trim() || report.lastKnownPosition,
    eventType: assessment.emergencyType
      ? mapAssessmentTypeToEventType(assessment.emergencyType)
      : report.eventType,
    severity: outcome.severity ?? report.severity,
    description: descriptionParts.join("\n"),
    actionsTaken: formatResponseActions(checklist.responseActions),
    notificationsMade: notificationsParts.join("\n"),
    additionalNotes: [
      contacts.additionalNotes.trim(),
      outcome.summary.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
    status,
    emergencyChecklist: checklist,
    updatedAt: now,
  };
}

export function persistChecklistUpdate(
  report: IncidentReport,
  checklist: EmergencyChecklistState,
  user: Pick<OccUser, "id" | "name">,
  auditAction: string,
  auditDetails?: string,
  closing = false,
): IncidentReport {
  const synced = syncIncidentReportFromChecklist(report, checklist, user, closing);
  return {
    ...synced,
    auditLog: [
      ...synced.auditLog,
      createIncidentAuditEntry(auditAction, user, auditDetails),
    ],
  };
}

export function completeResponseAction(
  checklist: EmergencyChecklistState,
  key: EmergencyResponseActionKey,
  user: Pick<OccUser, "id" | "name">,
  notes: string,
  completed: boolean,
): EmergencyChecklistState {
  return {
    ...checklist,
    responseActions: {
      ...checklist.responseActions,
      [key]: {
        completed,
        completedAt: completed ? Date.now() : null,
        completedByUserId: completed ? user.id : "",
        completedByUserName: completed ? user.name : "",
        notes: completed ? notes : "",
      },
    },
  };
}
