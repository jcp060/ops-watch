"use client";

import { memo } from "react";
import {
  Activity,
  AlertTriangle,
  MapPin,
  Radio,
  Users,
  UserCog,
} from "lucide-react";
import type { CommandMapSummary } from "@/lib/command-map-stats";

type CommandMapSummaryBarProps = {
  summary: CommandMapSummary;
  compact?: boolean;
};

export const CommandMapSummaryBar = memo(function CommandMapSummaryBar({
  summary,
  compact = false,
}: CommandMapSummaryBarProps) {
  return (
    <div
      className={`occ-command-summary grid shrink-0 gap-1.5 sm:grid-cols-2 lg:grid-cols-6 ${
        compact ? "occ-command-summary-compact" : "gap-2"
      }`}
    >
      <SummaryTile
        icon={Radio}
        label="Active aircraft"
        value={summary.totalActiveAircraft}
        tone="cyan"
        live
        compact={compact}
      />
      <SummaryTile
        icon={MapPin}
        label="Regions monitored"
        value={summary.regionsMonitored}
        tone="emerald"
        compact={compact}
      />
      <SummaryTile
        icon={AlertTriangle}
        label="Active alerts"
        value={summary.activeAlerts}
        tone={summary.activeAlerts > 0 ? "amber" : "slate"}
        pulse={summary.activeAlerts > 0}
        compact={compact}
      />
      <SummaryTile
        icon={AlertTriangle}
        label="Active emergencies"
        value={summary.activeEmergencies}
        tone={summary.activeEmergencies > 0 ? "red" : "slate"}
        pulse={summary.activeEmergencies > 0}
        compact={compact}
      />
      <SummaryTile
        icon={UserCog}
        label="Supervisors online"
        value={summary.supervisorsOnline}
        tone="violet"
        compact={compact}
      />
      <SummaryTile
        icon={Users}
        label="Operators online"
        value={summary.operatorsOnline}
        tone="blue"
        compact={compact}
      />
    </div>
  );
});

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
  live = false,
  pulse = false,
  compact = false,
}: {
  icon: typeof Radio;
  label: string;
  value: number;
  tone: "cyan" | "emerald" | "amber" | "slate" | "violet" | "blue" | "red";
  live?: boolean;
  pulse?: boolean;
  compact?: boolean;
}) {
  const toneClass = {
    cyan: "occ-summary-cyan",
    emerald: "occ-summary-emerald",
    amber: "occ-summary-amber",
    slate: "occ-summary-slate",
    violet: "occ-summary-violet",
    blue: "occ-summary-blue",
    red: "occ-summary-red",
  }[tone];

  return (
    <div className={`occ-summary-tile ${toneClass} ${pulse ? "occ-summary-pulse" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <Icon
          className={`shrink-0 opacity-80 ${compact ? "size-3.5" : "size-4"}`}
          aria-hidden
        />
        {live ? (
          <span className="occ-live-dot flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-400/90">
            <Activity className="size-3" aria-hidden />
            Live
          </span>
        ) : null}
      </div>
      <p
        className={`font-semibold uppercase tracking-[0.2em] opacity-70 ${
          compact ? "mt-1 text-[9px]" : "mt-2 text-[10px]"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-0.5 font-bold tabular-nums tracking-tight ${
          compact ? "text-lg leading-none" : "text-2xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
