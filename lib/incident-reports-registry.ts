import type { IncidentReport } from "./types";

export function cloneIncidentReport(report: IncidentReport): IncidentReport {
  return {
    ...report,
    attachments: report.attachments.map((a) => ({ ...a })),
    auditLog: report.auditLog.map((entry) => ({ ...entry })),
    emergencyChecklist: report.emergencyChecklist
      ? {
          ...report.emergencyChecklist,
          assessment: { ...report.emergencyChecklist.assessment },
          contacts: { ...report.emergencyChecklist.contacts },
          outcome: { ...report.emergencyChecklist.outcome },
          closeout: { ...report.emergencyChecklist.closeout },
          responseActions: Object.fromEntries(
            Object.entries(report.emergencyChecklist.responseActions).map(
              ([key, item]) => [key, { ...item }],
            ),
          ) as typeof report.emergencyChecklist.responseActions,
          updateLog: report.emergencyChecklist.updateLog.map((e) => ({ ...e })),
        }
      : undefined,
    responsePlanExecution: report.responsePlanExecution
      ? {
          ...report.responsePlanExecution,
          steps: report.responsePlanExecution.steps.map((step) => ({
            ...step,
            items: step.items.map((item) => ({
              ...item,
              options: item.options?.slice(),
            })),
          })),
          overrides: {
            notificationContacts:
              report.responsePlanExecution.overrides.notificationContacts.map(
                (contact) => ({ ...contact }),
              ),
            requiredInformation: {
              ...report.responsePlanExecution.overrides.requiredInformation,
            },
          },
          itemCompletions: Object.fromEntries(
            Object.entries(report.responsePlanExecution.itemCompletions).map(
              ([key, item]) => [key, { ...item }],
            ),
          ),
          notificationCompletions: Object.fromEntries(
            Object.entries(report.responsePlanExecution.notificationCompletions).map(
              ([key, item]) => [key, { ...item }],
            ),
          ),
          requiredInformation: { ...report.responsePlanExecution.requiredInformation },
          updateLog: report.responsePlanExecution.updateLog.map((e) => ({ ...e })),
          outcome: { ...report.responsePlanExecution.outcome },
        }
      : undefined,
  };
}

export function updateIncidentReportInRegistry(
  registry: IncidentReport[],
  report: IncidentReport,
  mode: "create" | "edit",
): IncidentReport[] {
  const next = cloneIncidentReport(report);

  if (mode === "create") {
    if (registry.some((r) => r.id === next.id)) return registry;
    return [next, ...registry];
  }

  const index = registry.findIndex((r) => r.id === next.id);
  if (index === -1) return registry;
  return registry.map((r) => (r.id === next.id ? next : r));
}

export function deleteIncidentReportById(
  registry: IncidentReport[],
  id: string,
): IncidentReport[] {
  return registry.filter((r) => r.id !== id);
}

export function hasUniqueIncidentReportIds(registry: IncidentReport[]): boolean {
  const seen = new Set<string>();
  for (const { id } of registry) {
    if (!id || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

export function hasUniqueIncidentReportNumbers(
  registry: IncidentReport[],
): boolean {
  const seen = new Set<string>();
  for (const { reportNumber } of registry) {
    if (!reportNumber || seen.has(reportNumber)) return false;
    seen.add(reportNumber);
  }
  return true;
}
