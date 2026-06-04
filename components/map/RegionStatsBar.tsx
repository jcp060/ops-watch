"use client";

import { memo, type CSSProperties } from "react";
import { GEOGRAPHIC_ZONE_ORDER } from "@/lib/monitoring-zones";
import {
  regionStatsSignature,
  type CommandMapStats,
} from "@/lib/command-map-stats";
import type { MonitoringZone } from "@/lib/types";
import { ZONE_MAP_STYLES } from "@/lib/operator-map-data";
import { RegionStatsCard } from "@/components/map/RegionStatsCard";

type RegionStatsBarProps = {
  commandStats: CommandMapStats;
  selectedZone: MonitoringZone | null;
  onSelectZone: (zone: MonitoringZone) => void;
};

export const RegionStatsBar = memo(
  function RegionStatsBar({
    commandStats,
    selectedZone,
    onSelectZone,
  }: RegionStatsBarProps) {
    return (
      <div
        className="occ-region-stats-bar occ-region-stats-bar-compact grid shrink-0 grid-cols-1 gap-3 border-t border-slate-700/80 bg-slate-950/80 px-3 py-3 sm:grid-cols-3 sm:gap-3 sm:px-4"
        role="group"
        aria-label="Regional live statistics"
      >
        {GEOGRAPHIC_ZONE_ORDER.map((zone) => {
          const glow = ZONE_MAP_STYLES[zone].glow;
          return (
            <div
              key={zone}
              className="occ-region-box min-w-0"
              style={{ "--zone-glow": glow } as CSSProperties}
            >
              <RegionStatsCard
                stats={commandStats.regions[zone]}
                selected={selectedZone === zone}
                onSelect={() => onSelectZone(zone)}
              />
            </div>
          );
        })}
      </div>
    );
  },
  (prev, next) =>
    prev.selectedZone === next.selectedZone &&
    GEOGRAPHIC_ZONE_ORDER.every(
      (zone) =>
        regionStatsSignature(prev.commandStats.regions[zone]) ===
        regionStatsSignature(next.commandStats.regions[zone]),
    ),
);
