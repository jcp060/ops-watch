"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IncidentStatusBadge } from "@/components/reports/IncidentStatusBadge";
import { SeverityBadge } from "@/components/reports/SeverityBadge";
import { ZoneBadge } from "@/components/ZoneBadge";
import { formatDateTime } from "@/lib/format";
import type { IncidentReport } from "@/lib/types";

type IncidentDetailModalProps = {
  report: IncidentReport | null;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function IncidentDetailModal({
  report,
  canEdit,
  canDelete,
  onClose,
  onEdit,
  onDelete,
}: IncidentDetailModalProps) {
  if (!report) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4 sm:px-6">
          <div>
            <p className="font-mono text-sm text-cyan-400">{report.reportNumber}</p>
            <h2
              id="incident-detail-title"
              className="mt-1 text-lg font-semibold text-slate-100"
            >
              {report.eventType}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {formatDateTime(report.eventAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <SeverityBadge severity={report.severity} />
            <IncidentStatusBadge status={report.status} />
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailItem label="Aircraft" value={report.tailNumber} mono />
            <DetailItem
              label="Organization"
              value={report.organizationName || "—"}
            />
            <DetailItem label="Location" value={report.location} />
            <DetailItem label="State" value={report.state} mono />
            <DetailItem
              label="Region"
              value={<ZoneBadge zone={report.region} />}
            />
            <DetailItem
              label="Created by"
              value={report.createdByUserName}
            />
            <DetailItem
              label="Created"
              value={formatDateTime(report.createdAt)}
            />
            <DetailItem
              label="Last updated"
              value={formatDateTime(report.updatedAt)}
            />
          </dl>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Description
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
              {report.description}
            </p>
          </section>

          {report.actionsTaken ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions taken
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                {report.actionsTaken}
              </p>
            </section>
          ) : null}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Attachments
            </h3>
            {report.attachments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">None recorded.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {report.attachments.map((file) => (
                  <li key={file.id} className="font-mono text-xs">
                    {file.fileName}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 px-5 py-4 sm:px-6">
          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
            >
              Delete
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Edit report
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-slate-200 ${mono ? "font-mono text-cyan-300/90" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
