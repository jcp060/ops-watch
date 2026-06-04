"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  useAircraftStore,
  useIncidentReportsStore,
  useOcc,
} from "@/context/OccContext";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import {
  emptyIncidentForm,
  formToIncidentDraft,
  IncidentFormModal,
  incidentToForm,
  type IncidentFormValues,
} from "@/components/reports/IncidentFormModal";
import { IncidentDetailModal } from "@/components/reports/IncidentDetailModal";
import { IncidentStatusBadge } from "@/components/reports/IncidentStatusBadge";
import { ReportsSubNav } from "@/components/reports/ReportsSubNav";
import { SeverityBadge } from "@/components/reports/SeverityBadge";
import { ZoneBadge } from "@/components/ZoneBadge";
import {
  canDeleteIncidentReports,
  canManageIncidentReports,
} from "@/lib/access-control";
import {
  emptyIncidentReportFilters,
  filterIncidentReports,
} from "@/lib/incident-report-search";
import { emergencyResponsePath } from "@/lib/emergency-routes";
import { formatDateTime } from "@/lib/format";
import { US_STATE_SELECT_OPTIONS } from "@/lib/monitoring-region-config";
import { createUniqueId } from "@/lib/unique-id";
import {
  INCIDENT_EVENT_TYPES,
  INCIDENT_REPORT_STATUSES,
  INCIDENT_SEVERITIES,
  MONITORING_ZONES,
} from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25";

export function IncidentsReport() {
  const { session } = useOcc();
  const role = session.currentUser?.role ?? "OCC Operator";
  const canManage = canManageIncidentReports(role);
  const canDelete = canDeleteIncidentReports(role);
  const userId = session.currentUser?.id ?? "unknown";
  const userName = session.currentUser?.name ?? "Unknown user";

  const { aircraftRegistry } = useAircraftStore();
  const { incidentReports, saveIncidentReport, deleteIncidentReport } =
    useIncidentReportsStore();

  const [filters, setFilters] = useState(emptyIncidentReportFilters);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IncidentFormValues>(emptyIncidentForm());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailReportId, setDetailReportId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterIncidentReports(incidentReports, filters),
    [incidentReports, filters],
  );

  const detailReport = detailReportId
    ? incidentReports.find((r) => r.id === detailReportId) ?? null
    : null;

  const hasFilters = Object.values(filters).some((v) => v !== "");

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyIncidentForm());
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const report = incidentReports.find((r) => r.id === id);
    if (!report) return;
    setModalMode("edit");
    setEditingId(id);
    setForm(incidentToForm(report));
    setSaveError(null);
    setModalOpen(true);
    setDetailReportId(null);
  };

  const handleSave = () => {
    const id = editingId ?? `ir-${createUniqueId()}`;
    const existing = incidentReports.find((r) => r.id === id);
    const draft = formToIncidentDraft(form, id, {
      createdByUserId: existing?.createdByUserId ?? userId,
      createdByUserName: existing?.createdByUserName ?? userName,
      createdAt: existing?.createdAt ?? Date.now(),
    });

    const result = saveIncidentReport(draft, modalMode);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    setSaveError(null);
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    deleteIncidentReport(deleteTargetId);
    if (detailReportId === deleteTargetId) setDetailReportId(null);
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-4">
      <ReportsSubNav />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            Accidents &amp; Incidents
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Document operational events, severity, and response actions for
            compliance review.
          </p>
          {!canManage ? (
            <p className="mt-2 text-xs text-slate-500">
              View-only access — contact a supervisor to create or edit reports.
            </p>
          ) : null}
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            <Plus className="size-4" aria-hidden />
            New report
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-lg shadow-black/10">
        <h3 className="text-sm font-semibold text-slate-200">Search &amp; filter</h3>
        <div className="relative mt-3 mb-3 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            type="search"
            value={filters.reportNumberQuery}
            onChange={(e) =>
              setFilters((f) => ({ ...f, reportNumberQuery: e.target.value }))
            }
            placeholder="Report number…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Aircraft (tail)
            </span>
            <input
              type="search"
              value={filters.tailQuery}
              onChange={(e) =>
                setFilters((f) => ({ ...f, tailQuery: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Organization
            </span>
            <input
              type="search"
              value={filters.organizationQuery}
              onChange={(e) =>
                setFilters((f) => ({ ...f, organizationQuery: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              State
            </span>
            <select
              value={filters.stateAbbr}
              onChange={(e) =>
                setFilters((f) => ({ ...f, stateAbbr: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">All states</option>
              {US_STATE_SELECT_OPTIONS.map((opt) => (
                <option key={opt.abbr} value={opt.abbr}>
                  {opt.abbr}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Region
            </span>
            <select
              value={filters.region}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  region: e.target.value as typeof filters.region,
                }))
              }
              className={inputClass}
            >
              <option value="">All regions</option>
              {MONITORING_ZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Severity
            </span>
            <select
              value={filters.severity}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  severity: e.target.value as typeof filters.severity,
                }))
              }
              className={inputClass}
            >
              <option value="">All severities</option>
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </span>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as typeof filters.status,
                }))
              }
              className={inputClass}
            >
              <option value="">All statuses</option>
              {INCIDENT_REPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Event type
            </span>
            <select
              value={filters.eventType}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  eventType: e.target.value as typeof filters.eventType,
                }))
              }
              className={inputClass}
            >
              <option value="">All types</option>
              {INCIDENT_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Date from
            </span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateFrom: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Date to
            </span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateTo: e.target.value }))
              }
              className={inputClass}
            />
          </label>
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => setFilters(emptyIncidentReportFilters())}
            className="mt-3 text-xs font-medium text-cyan-400 hover:text-cyan-300"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {incidentReports.length} reports
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold sm:px-6">Report #</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Date / time</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Aircraft</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Organization</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Event</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Severity</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Region</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    {incidentReports.length === 0
                      ? "No accident or incident reports yet."
                      : "No reports match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-4 font-mono text-cyan-300 sm:px-6">
                      {report.reportNumber}
                    </td>
                    <td className="px-4 py-4 text-slate-400 sm:px-6">
                      {formatDateTime(report.eventAt)}
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-300 sm:px-6">
                      {report.tailNumber}
                    </td>
                    <td className="px-4 py-4 text-slate-400 sm:px-6">
                      {report.organizationName || "—"}
                    </td>
                    <td className="px-4 py-4 text-slate-300 sm:px-6">
                      {report.eventType}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <SeverityBadge severity={report.severity} />
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <ZoneBadge zone={report.region} />
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <IncidentStatusBadge status={report.status} />
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setDetailReportId(report.id)}
                          className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
                        >
                          View
                        </button>
                        {report.isEmergencyTrigger &&
                        report.status !== "Closed" ? (
                          <a
                            href={emergencyResponsePath(report.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-red-400 hover:text-red-300"
                          >
                            Response
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <IncidentFormModal
        isOpen={modalOpen}
        mode={modalMode}
        values={form}
        aircraft={aircraftRegistry}
        saveError={saveError}
        onChange={setForm}
        onSubmit={handleSave}
        onClose={() => setModalOpen(false)}
      />

      <IncidentDetailModal
        report={detailReport}
        canEdit={canManage}
        canDelete={canDelete}
        onClose={() => setDetailReportId(null)}
        onEdit={() => {
          if (detailReport) openEdit(detailReport.id);
        }}
        onDelete={() => {
          if (detailReport) setDeleteTargetId(detailReport.id);
        }}
      />

      <ConfirmActionDialog
        isOpen={deleteTargetId !== null}
        message="Permanently delete this incident report? This cannot be undone."
        confirmLabel="Delete report"
        confirmTone="emerald"
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
