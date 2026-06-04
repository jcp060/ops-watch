"use client";

import { Radio } from "lucide-react";
import {
  useActiveFlightsStore,
  useAircraftStore,
  useArchiveStore,
  useIncidentReportsStore,
  useOcc,
  useUsersStore,
} from "@/context/OccContext";
import { useCommandMapStats } from "@/hooks/use-command-map-stats";
import { CommandMapSummaryBar } from "@/components/map/CommandMapSummaryBar";
import { UsaOperationsMap } from "@/components/map/UsaOperationsMap";

export function CommandMapView() {
  const { now } = useOcc();
  const { users } = useUsersStore();
  const { aircraftRegistry } = useAircraftStore();
  const { activeFlightViews } = useActiveFlightsStore();
  const { archivedFlights } = useArchiveStore();
  const { incidentReports } = useIncidentReportsStore();

  const commandStats = useCommandMapStats(
    users,
    activeFlightViews,
    archivedFlights,
    aircraftRegistry,
    now,
    incidentReports,
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
          <Radio className="size-3 shrink-0" aria-hidden />
          Command Map · Restricted
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Live regional workload · CONUS operations feed
        </p>
      </div>

      <CommandMapSummaryBar summary={commandStats.summary} compact />

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-cyan-500/25 bg-slate-950 shadow-xl shadow-cyan-950/15">
        <UsaOperationsMap
          variant="command"
          className="h-full"
          commandStats={commandStats}
        />
      </div>
    </div>
  );
}
