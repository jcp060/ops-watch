import type { IncidentReportStatus } from "@/lib/types";

const STYLES: Record<IncidentReportStatus, string> = {
  Open: "border-red-500/40 bg-red-500/10 text-red-200",
  "Active Response": "border-orange-500/40 bg-orange-500/10 text-orange-200",
  Monitoring: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  Resolved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  Closed: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

export function IncidentStatusBadge({ status }: { status: IncidentReportStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
