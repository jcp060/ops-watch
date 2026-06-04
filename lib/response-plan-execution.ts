import { clonePlanSteps } from "./response-plan-templates";
import {
  findResponsePlanByOrganizationId,
  upsertOrganizationResponsePlan,
} from "./response-plans-registry";
import type {
  EmergencyContactOutcome,
  IncidentReport,
  IncidentResponsePlanExecution,
  OccUser,
  OrganizationResponsePlan,
  OrganizationResponsePlanVersion,
  ResponsePlanItemCompletion,
  ResponsePlanStep,
} from "./types";
import { RESPONSE_PLAN_REQUIRED_INFO_FIELDS } from "./types";
import {
  buildNotificationCompletions,
  formatNotificationContactsForReport,
  formatNotificationTimelineEntry,
} from "./response-plan-notifications";
import { formatEmergencyPhoneDisplay } from "./emergency-contact";
import { createIncidentAuditEntry } from "./emergency-workflow";
import { createUniqueId } from "./unique-id";

export function getCurrentPlanVersion(
  plan: OrganizationResponsePlan,
): OrganizationResponsePlanVersion | null {
  return (
    plan.versions.find((v) => v.versionNumber === plan.currentVersionNumber) ??
    plan.versions[plan.versions.length - 1] ??
    null
  );
}

export function createExecutionFromPlanVersion(
  plan: OrganizationResponsePlan,
  version: OrganizationResponsePlanVersion,
  declaredAt: number,
): IncidentResponsePlanExecution {
  const steps = clonePlanSteps(version.steps).sort((a, b) => a.order - b.order);
  const itemCompletions: Record<string, ResponsePlanItemCompletion> = {};

  for (const step of steps) {
    for (const item of step.items) {
      itemCompletions[item.id] = {
        itemId: item.id,
        completed: false,
        completedAt: null,
        completedByUserId: "",
        completedByUserName: "",
        value: "",
      };
    }
  }

  const requiredInformation: Record<string, string> = {};
  for (const field of RESPONSE_PLAN_REQUIRED_INFO_FIELDS) {
    if (version.overrides.requiredInformation[field.key]) {
      requiredInformation[field.key] = "";
    }
  }

  return {
    planId: plan.id,
    organizationId: plan.organizationId,
    planName: version.planName,
    versionNumber: version.versionNumber,
    steps,
    overrides: structuredClone(version.overrides),
    declaredAt,
    currentStepIndex: 0,
    itemCompletions,
    notificationCompletions: buildNotificationCompletions(
      version.overrides.notificationContacts,
    ),
    requiredInformation,
    updateLog: [],
    outcome: {
      outcome: null,
      severity: null,
      summary: "",
      completedAt: null,
    },
    closedAt: null,
  };
}

export function isNotificationsStep(step: ResponsePlanStep): boolean {
  return step.title.trim().toLowerCase() === "notifications";
}

export function isOngoingMonitoringStep(step: ResponsePlanStep): boolean {
  return step.title.trim().toLowerCase() === "ongoing monitoring";
}

export function areRequiredNotificationsComplete(
  execution: IncidentResponsePlanExecution,
): boolean {
  const required = execution.overrides.notificationContacts.filter(
    (contact) => contact.required,
  );
  if (required.length === 0) return true;
  return required.every((contact) => {
    const completion = execution.notificationCompletions[contact.id];
    return completion?.outcome != null;
  });
}

export function isStepComplete(
  step: ResponsePlanStep,
  execution: IncidentResponsePlanExecution,
): boolean {
  if (
    isNotificationsStep(step) &&
    execution.overrides.notificationContacts.length > 0
  ) {
    return areRequiredNotificationsComplete(execution);
  }

  const requiredItems = step.items.filter((item) => item.required);
  if (requiredItems.length === 0) return true;

  return requiredItems.every((item) => {
    const completion = execution.itemCompletions[item.id];
    if (!completion) return false;
    if (item.type === "checkbox") return completion.completed;
    return completion.value.trim().length > 0;
  });
}

export function isRequiredInformationComplete(
  execution: IncidentResponsePlanExecution,
): boolean {
  for (const field of RESPONSE_PLAN_REQUIRED_INFO_FIELDS) {
    if (!execution.overrides.requiredInformation[field.key]) continue;
    const value = execution.requiredInformation[field.key]?.trim() ?? "";
    if (!value) return false;
  }
  return true;
}

export function calculateExecutionProgress(
  execution: IncidentResponsePlanExecution,
): number {
  const sorted = [...execution.steps].sort((a, b) => a.order - b.order);
  if (sorted.length === 0) return 0;
  const completed = sorted.filter((step) => isStepComplete(step, execution)).length;
  return Math.round((completed / sorted.length) * 100);
}

export function canAdvanceFromStep(
  execution: IncidentResponsePlanExecution,
): boolean {
  const sorted = [...execution.steps].sort((a, b) => a.order - b.order);
  if (execution.currentStepIndex >= sorted.length) return true;
  const step = sorted[execution.currentStepIndex];
  if (!step) return true;
  return isStepComplete(step, execution);
}

export function getActivePlanStep(
  execution: IncidentResponsePlanExecution,
): ResponsePlanStep | null {
  const sorted = [...execution.steps].sort((a, b) => a.order - b.order);
  if (execution.currentStepIndex >= sorted.length) return null;
  return sorted[execution.currentStepIndex] ?? null;
}

export function syncIncidentReportFromExecution(
  report: IncidentReport,
  execution: IncidentResponsePlanExecution,
  closing = false,
): IncidentReport {
  const sorted = [...execution.steps].sort((a, b) => a.order - b.order);
  const lines: string[] = [
    "=== ORGANIZATION EMERGENCY RESPONSE PLAN ===",
    `Plan: ${execution.planName} (v${execution.versionNumber})`,
    "",
  ];

  if (execution.overrides.notificationContacts.length > 0) {
    lines.push("NOTIFICATION CONTACTS");
    for (const contact of execution.overrides.notificationContacts) {
      const phone = contact.phone
        ? formatEmergencyPhoneDisplay(contact.phone)
        : "—";
      const requiredTag = contact.required ? " (required)" : "";
      const person = contact.name.trim() ? `${contact.name.trim()} · ` : "";
      const completion = execution.notificationCompletions[contact.id];
      const outcome = completion?.outcome ? ` — ${completion.outcome}` : "";
      lines.push(`  ${contact.label}: ${person}${phone}${requiredTag}${outcome}`);
    }
    lines.push("");
  }

  for (const step of sorted) {
    lines.push(step.title.toUpperCase());
    for (const item of step.items) {
      const completion = execution.itemCompletions[item.id];
      const value = completion?.value?.trim() ?? "";
      const status = completion?.completed || value ? "✓" : "—";
      const detail =
        value ||
        (completion?.completedAt
          ? `Completed ${new Date(completion.completedAt).toLocaleTimeString()}`
          : "");
      lines.push(`  ${status} ${item.label}${detail ? `: ${detail}` : ""}`);
    }
    lines.push("");
  }

  if (Object.keys(execution.requiredInformation).length > 0) {
    lines.push("REQUIRED INFORMATION");
    for (const [key, value] of Object.entries(execution.requiredInformation)) {
      const label =
        RESPONSE_PLAN_REQUIRED_INFO_FIELDS.find((f) => f.key === key)?.label ??
        key;
      lines.push(`  ${label}: ${value || "—"}`);
    }
    lines.push("");
  }

  if (execution.updateLog.length > 0) {
    lines.push("ONGOING UPDATES");
    for (const entry of execution.updateLog) {
      const time = new Date(entry.timestamp).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
      lines.push(`  ${time} — ${entry.userName}: ${entry.entry}`);
    }
    lines.push("");
  }

  if (execution.outcome.summary.trim()) {
    lines.push("OUTCOME", execution.outcome.summary.trim());
  }

  let status = report.status;
  if (closing) status = "Closed";
  else if (execution.currentStepIndex >= execution.steps.length) {
    status = "Monitoring";
  } else {
    status = "Active Response";
  }

  const actions = sorted
    .flatMap((step) =>
      step.items
        .filter((item) => execution.itemCompletions[item.id]?.completed)
        .map((item) => {
          const c = execution.itemCompletions[item.id];
          return `${item.label} (${c.completedByUserName})`;
        }),
    )
    .join("\n");

  const notifications = formatNotificationContactsForReport(
    execution.overrides.notificationContacts,
    execution.notificationCompletions,
  );

  const lastCoords =
    execution.requiredInformation.lastKnownCoordinates?.trim() ||
    report.lastKnownPosition;

  return {
    ...report,
    description: lines.join("\n"),
    actionsTaken: actions,
    notificationsMade: notifications,
    location: lastCoords || report.location,
    lastKnownPosition: lastCoords || report.lastKnownPosition,
    personsOnBoard:
      execution.requiredInformation.personsOnBoard?.trim() || report.personsOnBoard,
    severity: execution.outcome.severity ?? report.severity,
    status,
    responsePlanExecution: execution,
    updatedAt: Date.now(),
  };
}

export function persistExecutionUpdate(
  report: IncidentReport,
  execution: IncidentResponsePlanExecution,
  user: Pick<OccUser, "id" | "name">,
  auditAction: string,
  auditDetails?: string,
  closing = false,
): IncidentReport {
  const synced = syncIncidentReportFromExecution(report, execution, closing);
  return {
    ...synced,
    auditLog: [
      ...synced.auditLog,
      createIncidentAuditEntry(auditAction, user, auditDetails),
    ],
  };
}

export function completePlanItem(
  execution: IncidentResponsePlanExecution,
  itemId: string,
  user: Pick<OccUser, "id" | "name">,
  value: string,
  completed: boolean,
): IncidentResponsePlanExecution {
  return {
    ...execution,
    itemCompletions: {
      ...execution.itemCompletions,
      [itemId]: {
        itemId,
        completed,
        completedAt: completed ? Date.now() : null,
        completedByUserId: completed ? user.id : "",
        completedByUserName: completed ? user.name : "",
        value: completed ? value : "",
      },
    },
  };
}

export function recordNotificationAction(
  execution: IncidentResponsePlanExecution,
  contactId: string,
  outcome: EmergencyContactOutcome,
  user: Pick<OccUser, "id" | "name">,
): IncidentResponsePlanExecution {
  const contact = execution.overrides.notificationContacts.find(
    (entry) => entry.id === contactId,
  );
  if (!contact) return execution;

  const now = Date.now();
  const timelineEntry = formatNotificationTimelineEntry(contact, outcome, user.name);

  return {
    ...execution,
    notificationCompletions: {
      ...execution.notificationCompletions,
      [contactId]: {
        contactId,
        outcome,
        completedAt: now,
        completedByUserId: user.id,
        completedByUserName: user.name,
      },
    },
    updateLog: [
      ...execution.updateLog,
      {
        id: createUniqueId(),
        timestamp: now,
        userId: user.id,
        userName: user.name,
        entry: timelineEntry,
      },
    ],
  };
}

export function saveNewPlanVersionToRegistry(
  registry: OrganizationResponsePlan[],
  organizationId: string,
  draftVersion: OrganizationResponsePlanVersion,
): OrganizationResponsePlan[] {
  const existing = findResponsePlanByOrganizationId(registry, organizationId);
  const now = Date.now();

  if (!existing) {
    const plan: OrganizationResponsePlan = {
      id: `orp-${createUniqueId()}`,
      organizationId,
      currentVersionNumber: draftVersion.versionNumber,
      versions: [draftVersion],
      updatedAt: now,
    };
    return upsertOrganizationResponsePlan(registry, plan);
  }

  const updated: OrganizationResponsePlan = {
    ...existing,
    currentVersionNumber: draftVersion.versionNumber,
    versions: [...existing.versions, draftVersion],
    updatedAt: now,
  };
  return upsertOrganizationResponsePlan(registry, updated);
}
