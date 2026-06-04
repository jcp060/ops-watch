import type { EntityStatus } from "@/lib/types";

const STYLES: Record<EntityStatus, string> = {
  Active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Inactive: "border-slate-600 bg-slate-800/80 text-slate-400",
};

export function EntityStatusBadge({ status }: { status: EntityStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
