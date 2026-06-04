"use client";

import { useMemo, useState } from "react";
import { Download, Lock, Trash2 } from "lucide-react";
import { useArchiveStore, useOcc } from "@/context/OccContext";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { ReportsSubNav } from "@/components/reports/ReportsSubNav";
import { VerificationHistoryList } from "@/components/VerificationHistoryList";
import { ZoneBadge } from "@/components/ZoneBadge";
import {
  emptyArchivedFlightFilters,
  filterArchivedFlights,
} from "@/lib/archive-search";
import {
  formatArchiveRetentionStatus,
  getArchivedAt,
} from "@/lib/archive-retention";
import {
  formatDate,
  formatDateTime,
  formatDuration,
} from "@/lib/format";
import { US_STATE_SELECT_OPTIONS } from "@/lib/monitoring-region-config";
import { MONITORING_ZONES, VERIFICATION_OUTCOMES } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25";

export function ArchivedFlightsReport() {
  const { now } = useOcc();
  const { archivedFlights, deleteArchivedFlight } = useArchiveStore();
  const [filters, setFilters] = useState(emptyArchivedFlightFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredFlights = useMemo(
    () => filterArchivedFlights(archivedFlights, filters),
    [archivedFlights, filters],
  );

  const hasFilters = Object.values(filters).some((v) => v !== "");

  const flightPendingDelete = deleteConfirmId
    ? archivedFlights.find((flight) => flight.id === deleteConfirmId)
    : undefined;

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteError(null);
    const result = await deleteArchivedFlight(deleteConfirmId);
    if (!result.ok) {
      setDeleteError(
        result.message ??
          (result.reason === "retention_locked"
            ? "This record is still within the 14-day retention period."
            : "Could not delete archived flight."),
      );
      setDeleteConfirmId(null);
      return;
    }
    if (expandedId === deleteConfirmId) setExpandedId(null);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-4">
      <ReportsSubNav />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Archived Flights</h2>
          <p className="mt-1 text-sm text-slate-400">
            Landed flight history with verification records and retention controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            title="CSV export — coming soon"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-500"
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </button>
          <button
            type="button"
            disabled
            title="PDF export — coming soon"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-500"
          >
            <Download className="size-4" aria-hidden />
            Export PDF
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
        <p className="font-medium text-amber-200">14-day archive retention</p>
        <p className="mt-1 text-amber-100/80">
          Landed flights are kept for 14 days before permanent deletion is allowed.
          Records remain visible during retention and cannot be removed early.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-lg shadow-black/10">
        <h3 className="text-sm font-semibold text-slate-200">Search &amp; filter</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Tail number
            </span>
            <input
              type="search"
              value={filters.tailQuery}
              onChange={(e) =>
                setFilters((f) => ({ ...f, tailQuery: e.target.value }))
              }
              placeholder="N12345"
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
              placeholder="Organization name"
              className={inputClass}
            />
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
                  {opt.name} ({opt.abbr})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Landing from
            </span>
            <input
              type="date"
              value={filters.landingDateFrom}
              onChange={(e) =>
                setFilters((f) => ({ ...f, landingDateFrom: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Landing to
            </span>
            <input
              type="date"
              value={filters.landingDateTo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, landingDateTo: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Final status
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
              {VERIFICATION_OUTCOMES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => setFilters(emptyArchivedFlightFilters())}
            className="mt-3 text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {deleteError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {deleteError}
        </p>
      ) : null}

      <p className="text-xs text-slate-500">
        Showing {filteredFlights.length} of {archivedFlights.length} archived
        flights
      </p>

      {filteredFlights.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
          <p className="text-sm text-slate-400">
            No archived flights match your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFlights.map((flight) => {
            const isExpanded = expandedId === flight.id;
            const duration = formatDuration(
              flight.flightStartTime,
              flight.landingTime,
            );
            const archivedAt = getArchivedAt(flight);
            const retention = formatArchiveRetentionStatus(archivedAt, now);

            return (
              <article
                key={flight.id}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-lg shadow-black/10"
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3 font-semibold sm:px-5">Tail</th>
                        <th className="px-4 py-3 font-semibold sm:px-5">Type</th>
                        <th className="px-4 py-3 font-semibold sm:px-5">
                          Organization
                        </th>
                        <th className="px-4 py-3 font-semibold sm:px-5">State</th>
                        <th className="px-4 py-3 font-semibold sm:px-5">Region</th>
                        <th className="px-4 py-3 font-semibold sm:px-5">Start</th>
                        <th className="px-4 py-3 font-semibold sm:px-5">Landing</th>
                        <th className="px-4 py-3 font-semibold sm:px-5">Archived</th>
                        <th className="px-4 py-3 font-semibold sm:px-5">Duration</th>
                        <th className="px-4 py-3 font-semibold sm:px-5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-4 font-mono font-semibold text-cyan-300 sm:px-5">
                          {flight.tailNumber}
                        </td>
                        <td className="px-4 py-4 text-slate-300 sm:px-5">
                          {flight.aircraftType}
                        </td>
                        <td className="px-4 py-4 text-slate-400 sm:px-5">
                          {flight.organizationName?.trim() || "—"}
                        </td>
                        <td className="px-4 py-4 font-mono text-slate-400 sm:px-5">
                          {flight.homeState || "—"}
                        </td>
                        <td className="px-4 py-4 sm:px-5">
                          <ZoneBadge zone={flight.monitoringZone} />
                        </td>
                        <td className="px-4 py-4 text-slate-400 sm:px-5">
                          {formatDateTime(flight.flightStartTime)}
                        </td>
                        <td className="px-4 py-4 text-slate-400 sm:px-5">
                          {formatDateTime(flight.landingTime)}
                        </td>
                        <td className="px-4 py-4 text-slate-400 sm:px-5">
                          {formatDateTime(archivedAt)}
                        </td>
                        <td className="px-4 py-4 font-mono text-emerald-300 sm:px-5">
                          {duration}
                        </td>
                        <td className="px-4 py-4 sm:px-5">
                          <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                            {flight.finalStatus}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-800 px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      {retention.locked ? (
                        <p className="flex items-center gap-2 text-sm text-amber-200/90">
                          <Lock className="size-4 shrink-0 text-amber-400" aria-hidden />
                          <span>
                            <span className="font-medium">
                              {retention.lockedUntilLabel}
                            </span>
                            <span className="mt-0.5 block text-xs text-amber-200/70">
                              {retention.label}
                            </span>
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400">{retention.label}</p>
                      )}
                    </div>
                    {retention.locked ? (
                      <button
                        type="button"
                        disabled
                        title={retention.lockedUntilLabel}
                        className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-500"
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Delete permanently
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteConfirmId(flight.id);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Delete permanently
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : flight.id)
                    }
                    className="mt-3 flex w-full items-center justify-between text-left text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
                    aria-expanded={isExpanded}
                  >
                    <span>
                      Verification history ({flight.verificationHistory.length})
                    </span>
                    <span className="text-xs text-slate-500">
                      {isExpanded ? "Hide" : "Show"} · landed{" "}
                      {formatDate(flight.landingTime)}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 border-t border-slate-800/80 pt-3">
                      <VerificationHistoryList
                        records={flight.verificationHistory}
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmActionDialog
        isOpen={deleteConfirmId !== null}
        message={
          flightPendingDelete
            ? `Permanently delete archived flight ${flightPendingDelete.tailNumber}? This cannot be undone.`
            : "Permanently delete this archived flight?"
        }
        confirmLabel="Delete permanently"
        confirmTone="emerald"
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </div>
  );
}
