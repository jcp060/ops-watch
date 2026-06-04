"use client";

import { Plane, X } from "lucide-react";
import { EmergencyContactDisplay } from "@/components/aircraft/EmergencyContactDisplay";
import type { StateMapInsight } from "@/lib/operator-map-data";
import { ZoneBadge } from "@/components/ZoneBadge";

type OperatorMapSidePanelProps = {
  insight: StateMapInsight | null;
  onClose: () => void;
};

export function OperatorMapSidePanel({
  insight,
  onClose,
}: OperatorMapSidePanelProps) {
  if (!insight) return null;

  const { statusSummary } = insight;

  return (
    <aside className="absolute right-0 top-0 z-20 flex h-full w-full max-w-sm flex-col border-l border-cyan-500/20 bg-slate-950/95 shadow-2xl shadow-cyan-500/10 backdrop-blur-md sm:w-80">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-500/90">
            Region detail
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-100">
            {insight.abbr ?? insight.fips} · {insight.zone}
          </h3>
          <div className="mt-2">
            <ZoneBadge zone={insight.zone} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          aria-label="Close region panel"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Assigned operators
          </h4>
          {insight.operators.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No operators assigned.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {insight.operators.map((operator) => (
                <li
                  key={operator.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
                    style={{ backgroundColor: operator.color, color: operator.color }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {operator.name}
                    </p>
                    <p className="text-xs text-slate-500">{operator.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Plane className="size-3.5" aria-hidden />
            Aircraft in state
          </h4>
          {insight.aircraft.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No active aircraft in this state.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {insight.aircraft.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5"
                >
                  <p className="font-mono text-sm font-semibold text-cyan-300">
                    {row.tailNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {row.organizationName || "—"}
                  </p>
                  <div className="mt-2">
                    <EmergencyContactDisplay
                      name={row.emergencyContactName}
                      phone={row.emergencyContactPhone}
                      compact
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Live status
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-2">
            <Metric label="Monitoring" value={insight.aircraftCount} />
            <Metric label="En route" value={statusSummary.enRoute} tone="emerald" />
            <Metric label="Warning" value={statusSummary.warning} tone="amber" />
            <Metric label="Overdue" value={statusSummary.overdue} tone="red" />
            <Metric label="Landed today" value={statusSummary.landedToday} tone="cyan" />
          </dl>
        </section>
      </div>
    </aside>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "red" | "cyan";
}) {
  const toneClass = {
    slate: "text-slate-100",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    red: "text-red-400",
    cyan: "text-cyan-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-xl font-bold tabular-nums ${toneClass}`}>{value}</dd>
    </div>
  );
}
