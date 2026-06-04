"use client";

import { X, Plane, AlertTriangle, Clock, Users } from "lucide-react";
import { EmergencyContactDisplay } from "@/components/aircraft/EmergencyContactDisplay";
import type { RegionLiveStats } from "@/lib/command-map-stats";
import { ZONE_MAP_STYLES } from "@/lib/operator-map-data";
import { ZoneBadge } from "@/components/ZoneBadge";

type CommandRegionDetailPanelProps = {
  stats: RegionLiveStats | null;
  onClose: () => void;
};

export function CommandRegionDetailPanel({
  stats,
  onClose,
}: CommandRegionDetailPanelProps) {
  if (!stats) return null;

  const glow = ZONE_MAP_STYLES[stats.zone].glow;

  return (
    <aside
      className="occ-region-panel absolute right-0 top-0 z-30 flex h-full w-full max-w-md flex-col border-l shadow-2xl backdrop-blur-md sm:max-w-lg"
      style={{ borderColor: `${glow}44`, boxShadow: `0 0 40px ${glow}22` }}
    >
      <header className="border-b border-slate-800/80 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
              Region command · expanded
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-50">{stats.zone}</h3>
            <div className="mt-2">
              <ZoneBadge zone={stats.zone} />
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

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <PanelMetric label="Monitoring" value={stats.monitored} tone="sky" />
          <PanelMetric label="Workload" value={stats.workloadPerOperator} tone="violet" suffix="/op" />
          <PanelMetric label="Alerts" value={stats.emergency + stats.delayed} tone="amber" />
        </dl>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <SectionTitle icon={Users} title="Assigned operators & supervisors" />
          {stats.operators.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No operators assigned.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {stats.operators.map((operator) => (
                <li
                  key={operator.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
                    style={{
                      backgroundColor: operator.color,
                      color: operator.color,
                    }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {operator.name}
                    </p>
                    <p className="text-xs text-slate-500">{operator.role}</p>
                  </div>
                  {stats.supervisors.some((s) => s.id === operator.id) ? (
                    <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet-300">
                      Sup
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle icon={Plane} title="Aircraft roster" />
          {stats.aircraft.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No aircraft currently monitored.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {stats.aircraft.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-semibold text-slate-100">
                      {row.tailNumber}
                    </p>
                    <StatusChip status={row.status} label={row.statusLabel} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.organizationName || "—"}
                  </p>
                  <div className="mt-2">
                    <EmergencyContactDisplay
                      name={row.emergencyContactName}
                      phone={row.emergencyContactPhone}
                      compact
                    />
                  </div>
                  <div className="mt-2 flex gap-3 text-[10px] uppercase tracking-wide text-slate-500">
                    <span>
                      Due <span className="font-mono text-slate-300">{row.dueCountdown}</span>
                    </span>
                    <span>Verified {row.lastVerified}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle icon={Clock} title="Traffic · today" />
          <dl className="mt-2 grid grid-cols-2 gap-2">
            <PanelMetric label="Departures" value={stats.departuresToday} tone="cyan" />
            <PanelMetric label="Arrivals" value={stats.arrivalsToday} tone="emerald" />
          </dl>
        </section>

        <section>
          <SectionTitle icon={AlertTriangle} title="Recent alerts & events" />
          {stats.recentEvents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No recent events in the last 24 hours.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {stats.recentEvents.map((event) => (
                <li
                  key={event.id}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    event.severity === "alert"
                      ? "border-red-500/30 bg-red-500/10 text-red-200"
                      : event.severity === "caution"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        : "border-slate-700 bg-slate-900/50 text-slate-300"
                  }`}
                >
                  <p className="font-medium">{event.tailNumber}</p>
                  <p className="mt-0.5 opacity-90">{event.label}</p>
                  <p className="mt-1 text-[10px] opacity-60">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Regional status breakdown
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <PanelMetric label="Total" value={stats.totalAircraft} />
            <PanelMetric label="En route" value={stats.enRoute} tone="emerald" />
            <PanelMetric label="Landed" value={stats.landed} tone="cyan" />
            <PanelMetric label="Delayed" value={stats.delayed} tone="amber" />
            <PanelMetric label="Emergency" value={stats.emergency} tone="red" />
            <PanelMetric label="Weather holds" value={stats.weatherHolds} tone="amber" />
          </dl>
        </section>
      </div>
    </aside>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof Users;
  title: string;
}) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      <Icon className="size-3.5" aria-hidden />
      {title}
    </h4>
  );
}

function PanelMetric({
  label,
  value,
  tone = "slate",
  suffix = "",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "cyan" | "amber" | "red" | "sky" | "violet";
  suffix?: string;
}) {
  const valueTone = {
    slate: "text-slate-100",
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    red: "text-red-400",
    sky: "text-sky-300",
    violet: "text-violet-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-lg font-bold tabular-nums ${valueTone}`}>
        {value}
        {suffix ? (
          <span className="text-xs font-normal text-slate-500">{suffix}</span>
        ) : null}
      </dd>
    </div>
  );
}

function StatusChip({
  status,
  label,
}: {
  status: "ACTIVE" | "WARNING" | "OVERDUE";
  label: string;
}) {
  const className =
    status === "OVERDUE"
      ? "bg-red-500/20 text-red-300 border-red-500/40"
      : status === "WARNING"
        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
