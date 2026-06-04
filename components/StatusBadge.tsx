import type { AircraftStatus } from "@/lib/types";

const STATUS_STYLES: Record<
  AircraftStatus,
  { label: string; dot: string; badge: string }
> = {
  ACTIVE: {
    label: "ACTIVE",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  WARNING: {
    label: "WARNING",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  OVERDUE: {
    label: "OVERDUE",
    dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse",
    badge: "border-red-500/40 bg-red-500/15 text-red-300",
  },
};

export function StatusBadge({ status }: { status: AircraftStatus }) {
  const styles = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${styles.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
      {styles.label}
    </span>
  );
}
