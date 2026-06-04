"use client";

import type { ReactNode } from "react";
import { FormDialog } from "@/components/FormDialog";
import { aircraftFieldsForIncident } from "@/lib/incident-report-save";
import {
  getZoneForStateAbbr,
  US_STATE_SELECT_OPTIONS,
} from "@/lib/monitoring-region-config";
import type {
  Aircraft,
  IncidentAttachment,
  IncidentEventType,
  IncidentReport,
  IncidentReportStatus,
  IncidentSeverity,
} from "@/lib/types";
import {
  INCIDENT_EVENT_TYPES,
  INCIDENT_REPORT_STATUSES,
  INCIDENT_SEVERITIES,
} from "@/lib/types";
import { createUniqueId } from "@/lib/unique-id";

export type IncidentFormValues = {
  reportNumber: string;
  eventAtLocal: string;
  aircraftId: string;
  tailNumber: string;
  organizationId: string;
  organizationName: string;
  location: string;
  state: string;
  region: IncidentReport["region"];
  eventType: IncidentEventType;
  severity: IncidentSeverity;
  description: string;
  actionsTaken: string;
  status: IncidentReportStatus;
  attachments: IncidentAttachment[];
};

function timestampToDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToTimestamp(value: string): number {
  return new Date(value).getTime();
}

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30";

type IncidentFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  values: IncidentFormValues;
  aircraft: Aircraft[];
  saveError?: string | null;
  onChange: (values: IncidentFormValues) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function IncidentFormModal({
  isOpen,
  mode,
  values,
  aircraft,
  saveError,
  onChange,
  onSubmit,
  onClose,
}: IncidentFormModalProps) {
  const update = (patch: Partial<IncidentFormValues>) =>
    onChange({ ...values, ...patch });

  const sortedAircraft = [...aircraft].sort((a, b) =>
    a.tailNumber.localeCompare(b.tailNumber),
  );

  const handleAircraftChange = (aircraftId: string) => {
    const entry = aircraft.find((a) => a.id === aircraftId);
    if (!entry) {
      update({ aircraftId: "", tailNumber: "" });
      return;
    }
    update({
      ...aircraftFieldsForIncident(entry),
      aircraftId,
    });
  };

  const handleStateChange = (state: string) => {
    const region = getZoneForStateAbbr(state) ?? values.region;
    update({ state, region });
  };

  const addAttachment = () => {
    const name = window.prompt("Attachment file name (metadata only):");
    if (!name?.trim()) return;
    update({
      attachments: [
        ...values.attachments,
        {
          id: createUniqueId(),
          fileName: name.trim(),
          uploadedAt: Date.now(),
        },
      ],
    });
  };

  return (
    <FormDialog
      title={
        mode === "create" ? "New accident / incident report" : "Edit report"
      }
      subtitle="Operational event documentation for compliance and review."
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={mode === "create" ? "Create report" : "Save changes"}
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      {saveError ? (
        <p
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {saveError}
        </p>
      ) : null}

      {mode === "edit" ? (
        <Field label="Report number" id="ir-number">
          <input
            id="ir-number"
            readOnly
            value={values.reportNumber}
            className={`${inputClass} cursor-not-allowed opacity-70`}
          />
        </Field>
      ) : null}

      <Field label="Date / time" id="ir-event-at">
        <input
          id="ir-event-at"
          type="datetime-local"
          required
          value={values.eventAtLocal}
          onChange={(e) => update({ eventAtLocal: e.target.value })}
          className={inputClass}
        />
      </Field>

      <Field label="Aircraft" id="ir-aircraft">
        <select
          id="ir-aircraft"
          value={values.aircraftId}
          onChange={(e) => handleAircraftChange(e.target.value)}
          className={inputClass}
        >
          <option value="">— Select aircraft —</option>
          {sortedAircraft.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.tailNumber} · {entry.aircraftType}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organization" id="ir-org">
          <input
            id="ir-org"
            readOnly
            value={values.organizationName || "—"}
            className={`${inputClass} cursor-not-allowed opacity-70`}
          />
        </Field>
        <Field label="Region" id="ir-region">
          <input
            id="ir-region"
            readOnly
            value={values.region}
            className={`${inputClass} cursor-not-allowed opacity-70`}
          />
        </Field>
      </div>

      <Field label="Location" id="ir-location">
        <input
          id="ir-location"
          required
          value={values.location}
          onChange={(e) => update({ location: e.target.value })}
          placeholder="Airport, coordinates, or area description"
          className={inputClass}
        />
      </Field>

      <Field label="State" id="ir-state">
        <select
          id="ir-state"
          required
          value={values.state}
          onChange={(e) => handleStateChange(e.target.value)}
          className={inputClass}
        >
          <option value="">— Select state —</option>
          {US_STATE_SELECT_OPTIONS.map((opt) => (
            <option key={opt.abbr} value={opt.abbr}>
              {opt.name} ({opt.abbr})
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Event type" id="ir-type">
          <select
            id="ir-type"
            value={values.eventType}
            onChange={(e) =>
              update({ eventType: e.target.value as IncidentEventType })
            }
            className={inputClass}
          >
            {INCIDENT_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Severity" id="ir-severity">
          <select
            id="ir-severity"
            value={values.severity}
            onChange={(e) =>
              update({ severity: e.target.value as IncidentSeverity })
            }
            className={inputClass}
          >
            {INCIDENT_SEVERITIES.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Status" id="ir-status">
        <select
          id="ir-status"
          value={values.status}
          onChange={(e) =>
            update({ status: e.target.value as IncidentReportStatus })
          }
          className={inputClass}
        >
          {INCIDENT_REPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description" id="ir-desc">
        <textarea
          id="ir-desc"
          required
          rows={4}
          value={values.description}
          onChange={(e) => update({ description: e.target.value })}
          className={inputClass}
        />
      </Field>

      <Field label="Actions taken" id="ir-actions">
        <textarea
          id="ir-actions"
          rows={3}
          value={values.actionsTaken}
          onChange={(e) => update({ actionsTaken: e.target.value })}
          className={inputClass}
        />
      </Field>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Attachments</span>
          <button
            type="button"
            onClick={addAttachment}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            + Add reference
          </button>
        </div>
        {values.attachments.length === 0 ? (
          <p className="text-xs text-slate-500">
            File metadata only — upload integration coming soon.
          </p>
        ) : (
          <ul className="space-y-1 rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-sm text-slate-300">
            {values.attachments.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{file.fileName}</span>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      attachments: values.attachments.filter(
                        (a) => a.id !== file.id,
                      ),
                    })
                  }
                  className="shrink-0 text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormDialog>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

export function emptyIncidentForm(now = Date.now()): IncidentFormValues {
  return {
    reportNumber: "",
    eventAtLocal: timestampToDatetimeLocal(now),
    aircraftId: "",
    tailNumber: "",
    organizationId: "",
    organizationName: "",
    location: "",
    state: "",
    region: "Central",
    eventType: "Incident",
    severity: "Moderate",
    description: "",
    actionsTaken: "",
    status: "Open",
    attachments: [],
  };
}

export function incidentToForm(report: IncidentReport): IncidentFormValues {
  return {
    reportNumber: report.reportNumber,
    eventAtLocal: timestampToDatetimeLocal(report.eventAt),
    aircraftId: report.aircraftId,
    tailNumber: report.tailNumber,
    organizationId: report.organizationId,
    organizationName: report.organizationName,
    location: report.location,
    state: report.state,
    region: report.region,
    eventType: report.eventType,
    severity: report.severity,
    description: report.description,
    actionsTaken: report.actionsTaken,
    status: report.status,
    attachments: report.attachments.map((a) => ({ ...a })),
  };
}

export function formToIncidentDraft(
  form: IncidentFormValues,
  id: string,
  meta: {
    createdByUserId: string;
    createdByUserName: string;
    createdAt: number;
  },
): IncidentReport {
  const eventAt = datetimeLocalToTimestamp(form.eventAtLocal);
  return {
    id,
    reportNumber: form.reportNumber,
    eventAt,
    aircraftId: form.aircraftId,
    tailNumber: form.tailNumber,
    organizationId: form.organizationId,
    organizationName: form.organizationName,
    location: form.location,
    state: form.state,
    region: form.region,
    eventType: form.eventType,
    severity: form.severity,
    description: form.description,
    actionsTaken: form.actionsTaken,
    status: form.status,
    attachments: form.attachments,
    createdByUserId: meta.createdByUserId,
    createdByUserName: meta.createdByUserName,
    createdAt: meta.createdAt,
    updatedAt: Date.now(),
    sourceFlightId: undefined,
    isEmergencyTrigger: false,
    assignedOperatorName: meta.createdByUserName,
    flightStartTime: eventAt,
    flightDurationMinutes: 0,
    lastKnownPosition: "",
    personsOnBoard: "",
    notificationsMade: "",
    additionalNotes: "",
    auditLog: [],
  };
}
