import type { IncidentSeverity } from "@/lib/types";

const STYLES: Record<IncidentSeverity, string> = {
  Low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  Moderate: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  High: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  Critical: "border-red-500/50 bg-red-500/15 text-red-200",
};

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}
