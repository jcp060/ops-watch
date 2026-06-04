"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import {
  useAircraftStore,
  useIncidentReportsStore,
  useOcc,
} from "@/context/OccContext";
import { IncidentStatusBadge } from "@/components/reports/IncidentStatusBadge";
import { ReportsSubNav } from "@/components/reports/ReportsSubNav";
import { SeverityBadge } from "@/components/reports/SeverityBadge";
import { canEditEmergencyIncidentReport } from "@/lib/access-control";
import { findIncidentByRouteParam } from "@/lib/emergency-routes";
import { formatDateTime } from "@/lib/format";
import {
  formatEmergencyPhoneDisplay,
  normalizeEmergencyPhone,
} from "@/lib/emergency-contact";
import {
  calculateExecutionProgress,
  canAdvanceFromStep,
  completePlanItem,
  getActivePlanStep,
  isNotificationsStep,
  isOngoingMonitoringStep,
  isStepComplete,
  persistExecutionUpdate,
  recordNotificationAction,
} from "@/lib/response-plan-execution";
import { createUniqueId } from "@/lib/unique-id";
import { isIncidentReportsStoreHydrated } from "@/stores/incident-reports-store";
import {
  EMERGENCY_CONTACT_OUTCOME_LABELS,
  EMERGENCY_CONTACT_OUTCOMES,
  type EmergencyContactOutcome,
  type IncidentResponsePlanExecution,
  type ResponsePlanChecklistItem,
  type ResponsePlanNotificationContact,
} from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-750 disabled:cursor-not-allowed disabled:opacity-50";

export function EmergencyResponseWorkflow({ incidentId }: { incidentId: string }) {
  const { session } = useOcc();
  const role = session.currentUser?.role ?? "OCC Operator";
  const user = {
    id: session.currentUser?.id ?? "unknown",
    name: session.currentUser?.name ?? "Unknown user",
  };

  const { aircraftRegistry } = useAircraftStore();
  const { incidentReports, saveIncidentReport } = useIncidentReportsStore();

  const report = useMemo(
    () => findIncidentByRouteParam(incidentReports, incidentId),
    [incidentReports, incidentId],
  );

  const [localExecution, setLocalExecution] =
    useState<IncidentResponsePlanExecution | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [resolveTimedOut, setResolveTimedOut] = useState(false);

  const execution = localExecution ?? report?.responsePlanExecution ?? null;

  useEffect(() => {
    if (report) setResolveTimedOut(false);
    if (!incidentId.trim() || report) return;
    const timer = window.setTimeout(() => setResolveTimedOut(true), 2000);
    return () => window.clearTimeout(timer);
  }, [incidentId, report]);

  const canEdit =
    report !== null && canEditEmergencyIncidentReport(role, report, user.id);

  const sortedSteps = useMemo(
    () =>
      execution
        ? [...execution.steps].sort((a, b) => a.order - b.order)
        : [],
    [execution],
  );

  const totalSteps = sortedSteps.length;
  const onPlanSteps =
    execution != null && execution.currentStepIndex < sortedSteps.length;
  const progress = execution ? calculateExecutionProgress(execution) : 0;

  const persist = useCallback(
    (
      next: IncidentResponsePlanExecution,
      auditAction: string,
      auditDetails?: string,
      closing = false,
    ) => {
      if (!report || !canEdit) return;
      const updated = persistExecutionUpdate(
        report,
        next,
        user,
        auditAction,
        auditDetails,
        closing,
      );
      saveIncidentReport(updated, "edit");
      setLocalExecution(next);
    },
    [report, canEdit, user, saveIncidentReport],
  );

  const handleNotificationAction = (
    contactId: string,
    outcome: EmergencyContactOutcome,
  ) => {
    if (!execution) return;
    const contact = execution.overrides.notificationContacts.find(
      (entry) => entry.id === contactId,
    );
    if (!contact) return;
    const next = recordNotificationAction(execution, contactId, outcome, user);
    persist(
      next,
      "Notification recorded",
      `${contact.label} — ${EMERGENCY_CONTACT_OUTCOME_LABELS[outcome]}`,
    );
  };

  const handleContinue = () => {
    if (!execution) return;
    setStepError(null);
    if (!canAdvanceFromStep(execution)) {
      const active = getActivePlanStep(execution);
      if (
        active &&
        isNotificationsStep(active) &&
        execution.overrides.notificationContacts.length > 0
      ) {
        setStepError(
          "Record an action for each required notification contact before continuing.",
        );
      } else {
        setStepError("Complete all required items before continuing.");
      }
      return;
    }
    const nextIndex = Math.min(execution.currentStepIndex + 1, sortedSteps.length);
    const next = { ...execution, currentStepIndex: nextIndex };
    persist(next, "Response plan step completed", `Step ${nextIndex}`);
  };

  const handleBack = () => {
    if (!execution || execution.currentStepIndex <= 0) return;
    persist(
      { ...execution, currentStepIndex: execution.currentStepIndex - 1 },
      "Returned to previous step",
    );
  };

  const handleClose = () => {
    if (!execution) return;
    persist(
      { ...execution, closedAt: Date.now() },
      "Incident closed",
      report?.reportNumber,
      true,
    );
  };

  const addUpdate = () => {
    if (!execution || !updateText.trim()) return;
    const next: IncidentResponsePlanExecution = {
      ...execution,
      updateLog: [
        ...execution.updateLog,
        {
          id: createUniqueId(),
          timestamp: Date.now(),
          userId: user.id,
          userName: user.name,
          entry: updateText.trim(),
        },
      ],
    };
    setUpdateText("");
    persist(next, "Situation update added", updateText.trim());
  };

  if (!incidentId.trim()) {
    return <MissingWorkflow message="No incident id provided." />;
  }

  if (!report) {
    if (!resolveTimedOut && isIncidentReportsStoreHydrated()) {
      return <WorkflowLoading />;
    }
    return <MissingWorkflow message="Incident not found." />;
  }

  if (!execution) {
    return (
      <MissingWorkflow message="This incident has no organization response plan execution data. Legacy checklist incidents may need manual review." />
    );
  }

  const activeStep = getActivePlanStep(execution);
  const isClosed = report.status === "Closed";
  const isNotificationsActiveStep =
    activeStep != null &&
    isNotificationsStep(activeStep) &&
    execution.overrides.notificationContacts.length > 0;
  const isOngoingMonitoringActiveStep =
    activeStep != null && isOngoingMonitoringStep(activeStep);
  const stepLabel = activeStep?.title ?? "Complete";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-red-900/50 bg-gradient-to-r from-red-950/80 via-slate-950 to-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <ReportsSubNav />
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-red-400">
                <ShieldAlert className="size-6" aria-hidden />
                <h1 className="text-xl font-bold text-red-100">
                  Emergency Response Workflow
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {execution.planName} · v{execution.versionNumber}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <IncidentStatusBadge status={report.status} />
              {report.severity ? <SeverityBadge severity={report.severity} /> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-slate-500">Aircraft</dt>
                <dd className="text-lg font-bold text-red-200">{report.tailNumber}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Incident #</dt>
                <dd className="font-mono text-cyan-300">{report.reportNumber}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Organization</dt>
                <dd>{report.organizationName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Response plan</dt>
                <dd>{execution.planName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Time declared</dt>
                <dd>{formatDateTime(execution.declaredAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Flight follower</dt>
                <dd>{report.assignedOperatorName || report.createdByUserName}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-5">
            <p className="text-sm font-medium text-red-200">
              {onPlanSteps
                ? `Step ${execution.currentStepIndex + 1} of ${totalSteps}: ${stepLabel}`
                : stepLabel}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-red-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {onPlanSteps && activeStep ? (
              <div className="mt-4 space-y-3">
                {isNotificationsActiveStep ? (
                  <NotificationsStepPanel
                    contacts={execution.overrides.notificationContacts}
                    completions={execution.notificationCompletions}
                    disabled={!canEdit || isClosed}
                    onAction={handleNotificationAction}
                  />
                ) : isOngoingMonitoringActiveStep ? (
                  <OngoingMonitoringPanel
                    value={updateText}
                    disabled={!canEdit || isClosed}
                    entries={execution.updateLog}
                    onChange={setUpdateText}
                    onSubmit={addUpdate}
                  />
                ) : (
                  activeStep.items.map((item) => (
                    <PlanItemField
                      key={item.id}
                      item={item}
                      execution={execution}
                      disabled={!canEdit || isClosed}
                      onChange={(next) => persist(next, `Checklist: ${item.label}`)}
                      user={user}
                    />
                  ))
                )}
              </div>
            ) : !onPlanSteps ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-400">
                  All plan steps complete. Add ongoing updates or close the incident.
                </p>
                <textarea
                  className={`${inputClass} min-h-[72px]`}
                  disabled={!canEdit || isClosed}
                  placeholder="Situation update…"
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && updateText.trim()) {
                      e.preventDefault();
                      addUpdate();
                    }
                  }}
                />
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={!canEdit || isClosed || !updateText.trim()}
                  onClick={addUpdate}
                >
                  Add update
                </button>
                {!isClosed ? (
                  <button type="button" className={`${btnPrimary} w-full`} onClick={handleClose}>
                    Close incident
                  </button>
                ) : null}
              </div>
            ) : null}

            {stepError ? (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {stepError}
              </p>
            ) : null}

            {onPlanSteps ? (
              <div className="mt-6 flex justify-between border-t border-slate-700/60 pt-4">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={handleBack}
                  disabled={execution.currentStepIndex <= 0 || isClosed}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Back
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={handleContinue}
                  disabled={!canEdit || isClosed}
                >
                  Continue
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <IncidentTimelinePanel entries={execution.updateLog} />
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Plan progress
          </h2>
          <p className="mt-2 font-mono text-2xl text-red-300">{progress}%</p>
          <ul className="mt-4 space-y-2 text-sm">
            {sortedSteps.map((step, index) => {
              const done = isStepComplete(step, execution);
              const active = execution.currentStepIndex === index;
              return (
                <li
                  key={step.id}
                  className={
                    active ? "text-red-200" : done ? "text-emerald-400/90" : "text-slate-500"
                  }
                >
                  {step.title}
                </li>
              );
            })}
          </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function OngoingMonitoringPanel({
  value,
  disabled,
  entries,
  onChange,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  entries: IncidentResponsePlanExecution["updateLog"];
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit = !disabled && value.trim().length > 0;
  const recentEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (canSubmit) onSubmit();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        Notifications are complete. Stay on this step and post situation updates as
        the emergency develops.
      </p>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-400">Situation update</span>
        <textarea
          className={`${inputClass} min-h-[96px]`}
          disabled={disabled}
          placeholder="Enter update and press Enter to submit…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </label>
      <p className="text-xs text-slate-500">
        Press <kbd className="rounded border border-slate-700 px-1">Enter</kbd> to
        submit ·{" "}
        <kbd className="rounded border border-slate-700 px-1">Shift</kbd>+
        <kbd className="rounded border border-slate-700 px-1">Enter</kbd> for a
        new line
      </p>
      <button
        type="button"
        className={btnPrimary}
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        Add update
      </button>
      {recentEntries.length > 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Updates this incident
          </h3>
          <ul className="mt-2 space-y-2">
            {recentEntries.map((entry) => (
              <li key={entry.id} className="text-sm text-slate-300">
                <span className="font-mono text-xs text-slate-500">
                  {new Date(entry.timestamp).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>{" "}
                {entry.entry}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function NotificationsStepPanel({
  contacts,
  completions,
  disabled,
  onAction,
}: {
  contacts: ResponsePlanNotificationContact[];
  completions: IncidentResponsePlanExecution["notificationCompletions"];
  disabled: boolean;
  onAction: (contactId: string, outcome: EmergencyContactOutcome) => void;
}) {
  if (contacts.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No notification contacts configured for this organization.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Record notification attempts for each organization contact below.
      </p>
      {contacts.map((contact) => {
        const completion = completions[contact.id];
        const selectedOutcome = completion?.outcome ?? null;
        const displayPhone = contact.phone
          ? formatEmergencyPhoneDisplay(contact.phone)
          : null;
        const telHref = contact.phone
          ? `tel:${normalizeEmergencyPhone(contact.phone)}`
          : null;

        return (
          <div
            key={contact.id}
            className="rounded-xl border border-slate-700/60 bg-slate-950/30 p-4"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedOutcome != null}
                readOnly
                disabled
                className="mt-1"
                aria-label={`${contact.label} notified`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">
                  {contact.label} Notified
                  {contact.required ? (
                    <span className="ml-1 text-red-400">*</span>
                  ) : null}
                </p>
                {contact.name.trim() ? (
                  <p className="mt-1 text-sm text-slate-300">{contact.name}</p>
                ) : null}
                {displayPhone && telHref ? (
                  <a
                    href={telHref}
                    className="mt-1 inline-block font-mono text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    {displayPhone}
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">No phone on file</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {EMERGENCY_CONTACT_OUTCOMES.map((outcome) => (
                    <button
                      key={outcome}
                      type="button"
                      disabled={disabled}
                      onClick={() => onAction(contact.id, outcome)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        selectedOutcome === outcome
                          ? "border-red-600 bg-red-950/50 text-red-100"
                          : "border-slate-600 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {EMERGENCY_CONTACT_OUTCOME_LABELS[outcome]}
                    </button>
                  ))}
                </div>
                {completion?.completedAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDateTime(completion.completedAt)} ·{" "}
                    {completion.completedByUserName}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IncidentTimelinePanel({
  entries,
}: {
  entries: IncidentResponsePlanExecution["updateLog"];
}) {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Incident timeline
      </h2>
      <ul className="mt-3 space-y-2">
        {sorted.map((entry) => (
          <li key={entry.id} className="text-sm text-slate-300">
            <span className="font-mono text-xs text-slate-500">
              {new Date(entry.timestamp).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>{" "}
            {entry.entry}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanItemField({
  item,
  execution,
  disabled,
  onChange,
  user,
}: {
  item: ResponsePlanChecklistItem;
  execution: IncidentResponsePlanExecution;
  disabled: boolean;
  onChange: (next: IncidentResponsePlanExecution) => void;
  user: { id: string; name: string };
}) {
  const completion = execution.itemCompletions[item.id];
  const value = completion?.value ?? "";

  const commit = (nextValue: string, completed: boolean) => {
    onChange(
      completePlanItem(execution, item.id, user, nextValue, completed),
    );
  };

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-3">
      <p className="text-sm font-medium text-slate-200">
        {item.label}
        {item.required ? <span className="text-red-400"> *</span> : null}
      </p>
      {item.type === "checkbox" ? (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={disabled}
            checked={completion?.completed ?? false}
            onChange={(e) => commit("", e.target.checked)}
          />
          Mark complete
          {completion?.completedAt ? (
            <span className="text-xs text-slate-500">
              {formatDateTime(completion.completedAt)} · {completion.completedByUserName}
            </span>
          ) : null}
        </label>
      ) : item.type === "yes_no" ? (
        <div className="mt-2 flex gap-2">
          {(["Yes", "No"] as const).map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => commit(option, true)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                value === option
                  ? "border-red-600 bg-red-950/50 text-red-100"
                  : "border-slate-600 text-slate-300"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : item.type === "dropdown" && item.options ? (
        <select
          className={`${inputClass} mt-2`}
          disabled={disabled}
          value={value}
          onChange={(e) => commit(e.target.value, e.target.value.length > 0)}
        >
          <option value="">Select…</option>
          {item.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <textarea
          className={`${inputClass} mt-2 min-h-[60px]`}
          disabled={disabled}
          value={value}
          onChange={(e) => commit(e.target.value, e.target.value.trim().length > 0)}
        />
      )}
    </div>
  );
}

function WorkflowLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
      Loading emergency response workflow…
    </div>
  );
}

function MissingWorkflow({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <ReportsSubNav />
      <div className="mx-auto mt-8 max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 text-center">
        <ShieldAlert className="mx-auto size-10 text-red-400" aria-hidden />
        <p className="mt-4 text-slate-300">{message}</p>
        <Link href="/reports/incidents" className="mt-4 inline-block text-sm text-cyan-400 hover:underline">
          View Accidents &amp; Incidents
        </Link>
      </div>
    </div>
  );
}
