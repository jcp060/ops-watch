"use client";

import { formatCountdown, getAircraftStatus } from "@/lib/aircraft-status";
import { isFlightInEmergency } from "@/lib/emergency-workflow";
import type { ActiveFlight, AircraftStatus } from "@/lib/types";

const STATUS_CARD: Record<
  AircraftStatus,
  {
    label: string;
    dot: string;
    border: string;
    bg: string;
    text: string;
    timer: string;
  }
> = {
  ACTIVE: {
    label: "ACTIVE",
    dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.55)]",
    border: "border-emerald-500/35 hover:border-emerald-400/55",
    bg: "bg-emerald-500/[0.06] hover:bg-emerald-500/10",
    text: "text-emerald-300",
    timer: "text-emerald-300",
  },
  WARNING: {
    label: "WARNING",
    dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.55)]",
    border: "border-amber-500/40 hover:border-amber-400/60",
    bg: "bg-amber-500/[0.08] hover:bg-amber-500/12",
    text: "text-amber-300",
    timer: "text-amber-300",
  },
  OVERDUE: {
    label: "OVERDUE",
    dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.65)] animate-pulse",
    border: "border-red-500/50 hover:border-red-400/70",
    bg: "bg-red-950/35 hover:bg-red-950/50",
    text: "text-red-300",
    timer: "text-red-400",
  },
};

const EMERGENCY_CARD = {
  label: "EMERGENCY",
  dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse",
  border: "border-red-500/60 hover:border-red-400/80",
  bg: "bg-red-950/45 hover:bg-red-950/55",
  text: "text-red-200",
  timer: "text-red-300",
};

type ActiveFlightCardProps = {
  flight: ActiveFlight;
  now: number;
  onSelect: (flightId: string) => void;
};

export function ActiveFlightCard({
  flight,
  now,
  onSelect,
}: ActiveFlightCardProps) {
  const inEmergency = isFlightInEmergency(flight);
  const status = getAircraftStatus(flight.dueAt, now);
  const styles = inEmergency ? EMERGENCY_CARD : STATUS_CARD[status];
  const countdown = formatCountdown(flight.dueAt, now);
  const statusLabel = inEmergency ? EMERGENCY_CARD.label : styles.label;

  return (
    <button
      type="button"
      onClick={() => onSelect(flight.id)}
      className={`group flex h-[4.5rem] min-w-0 flex-col justify-between rounded-lg border px-2.5 py-1.5 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${styles.border} ${styles.bg}`}
      aria-label={`View ${flight.tailNumber}, ${flight.organizationName?.trim() || "no organization"}, ${statusLabel}, due ${countdown}`}
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-base font-bold leading-none tracking-tight text-cyan-300 group-hover:text-cyan-200">
          {flight.tailNumber}
        </p>
        {flight.organizationName?.trim() ? (
          <p className="mt-0.5 truncate text-[10px] leading-none text-slate-500">
            {flight.organizationName}
          </p>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${styles.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
          {statusLabel}
        </span>
        <span
          className={`font-mono text-sm font-semibold tabular-nums leading-none ${styles.timer}`}
        >
          {countdown}
        </span>
      </div>
    </button>
  );
}
