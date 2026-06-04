"use client";

import { memo } from "react";
import {
  regionStatsSignature,
  type RegionLiveStats,
  type RegionSeverity,
} from "@/lib/command-map-stats";
import { ZONE_MAP_STYLES } from "@/lib/operator-map-data";

type RegionStatsCardProps = {
  stats: RegionLiveStats;
  selected: boolean;
  onSelect: () => void;
};

export const RegionStatsCard = memo(
  function RegionStatsCard({ stats, selected, onSelect }: RegionStatsCardProps) {
    const style = ZONE_MAP_STYLES[stats.zone];
    const severityClass = SEVERITY_CLASS[stats.severity];

    return (
      <button
        type="button"
        onClick={onSelect}
        className={`occ-region-card flex h-full w-full flex-col text-left ${severityClass} ${
          selected ? "occ-region-card-selected" : ""
        }`}
        style={
          {
            "--zone-glow": style.glow,
          } as React.CSSProperties
        }
        aria-pressed={selected}
        aria-label={`${stats.zone} region statistics`}
      >
        <div className="occ-region-card-header flex items-center justify-between gap-2 px-4 py-3">
          <span className="occ-region-card-title text-sm">{stats.zone}</span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span className="occ-live-dot size-1.5 shrink-0 rounded-full" aria-hidden />
            Live
          </span>
        </div>

        <div className="occ-region-card-body flex-1 px-4 pb-3">
          <dl className="occ-region-stats-grid grid grid-cols-2 gap-2 text-xs">
            <Stat label="Total" value={stats.totalAircraft} tone="neutral" />
            <Stat label="En route" value={stats.enRoute} tone="green" />
            <Stat label="Landed" value={stats.landed} tone="cyan" />
            <Stat label="Delayed" value={stats.delayed} tone="yellow" />
            <Stat label="Alert" value={stats.emergency} tone="red" />
            <Stat label="Holds" value={stats.weatherHolds} tone="yellow" />
          </dl>
        </div>

        <div className="occ-region-card-footer border-t border-slate-700/80 bg-slate-900/50 px-4 py-2.5 text-xs">
          <span className="font-semibold text-sky-300">{stats.monitored}</span>
          <span className="text-slate-400"> aircraft monitored now</span>
        </div>
      </button>
    );
  },
  (prev, next) =>
    prev.selected === next.selected &&
    regionStatsSignature(prev.stats) === regionStatsSignature(next.stats),
);

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "green" | "cyan" | "yellow" | "red";
}) {
  const valueClass = {
    neutral: "text-slate-100",
    green: "text-emerald-300",
    cyan: "text-cyan-300",
    yellow: "text-amber-300",
    red: "text-red-400",
  }[tone];

  const cellClass = {
    neutral: "occ-stat-cell-neutral",
    green: "occ-stat-cell-green",
    cyan: "occ-stat-cell-cyan",
    yellow: "occ-stat-cell-yellow",
    red: "occ-stat-cell-red",
  }[tone];

  return (
    <div className={`occ-stat-cell rounded-md border px-2.5 py-2 ${cellClass}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={`mt-0.5 text-lg font-bold tabular-nums leading-none ${valueClass}`}>
        {value}
      </dd>
    </div>
  );
}

const SEVERITY_CLASS: Record<RegionSeverity, string> = {
  normal: "occ-region-normal",
  caution: "occ-region-caution",
  alert: "occ-region-alert",
  monitoring: "occ-region-monitoring",
};
