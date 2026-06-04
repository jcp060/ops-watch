"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useActiveFlightsStore,
  useAircraftStore,
  useArchiveStore,
  useIncidentReportsStore,
  useOcc,
  useUsersStore,
} from "@/context/OccContext";
import {
  buildOrganizationMapSummaries,
  filterAircraftByOrganization,
  filterFlightsByOrganization,
} from "@/lib/organization-aircraft";
import {
  buildCommandMapStats,
  type CommandMapStats,
} from "@/lib/command-map-stats";
import { GEOGRAPHIC_ZONE_ORDER } from "@/lib/monitoring-zones";
import {
  buildOperationsMapModel,
  ZONE_MAP_STYLES,
  type StateMapInsight,
} from "@/lib/operator-map-data";
import type { MonitoringZone } from "@/lib/types";
import {
  createUsMapProjection,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_MAP_WIDTH,
  fetchUsStatesTopology,
  projectStatePaths,
  type ProjectedState,
} from "@/lib/us-map-geo";
import { CommandRegionDetailPanel } from "@/components/map/CommandRegionDetailPanel";
import { MapMarkersLayer } from "@/components/map/MapMarkersLayer";
import { MapStateCountLayer } from "@/components/map/MapStateCountLayer";
import { MapStatePathsLayer } from "@/components/map/MapStatePathsLayer";
import { OperatorMapSidePanel } from "@/components/map/OperatorMapSidePanel";
import { OrganizationMapFilter } from "@/components/map/OrganizationMapFilter";
import { RegionStatsBar } from "@/components/map/RegionStatsBar";

type HoverState = {
  fips: string;
  x: number;
  y: number;
};

type UsaOperationsMapProps = {
  variant?: "embedded" | "command";
  className?: string;
  /** Precomputed command stats — avoids duplicate aggregation in parent. */
  commandStats?: CommandMapStats;
};

export function UsaOperationsMap({
  variant = "embedded",
  className = "",
  commandStats,
}: UsaOperationsMapProps) {
  const isCommand = variant === "command";
  const { now } = useOcc();
  const { users } = useUsersStore();
  const { aircraftRegistry } = useAircraftStore();
  const { activeFlightViews } = useActiveFlightsStore();
  const { archivedFlights } = useArchiveStore();
  const { incidentReports } = useIncidentReportsStore();
  const [organizationFilterId, setOrganizationFilterId] = useState<string | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const [projectedStates, setProjectedStates] = useState<ProjectedState[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [selectedFips, setSelectedFips] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<MonitoringZone | null>(null);

  const projection = useMemo(
    () => createUsMapProjection(DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT),
    [],
  );

  const filteredFlights = useMemo(
    () =>
      isCommand
        ? filterFlightsByOrganization(
            activeFlightViews,
            aircraftRegistry,
            organizationFilterId,
          )
        : activeFlightViews,
    [
      isCommand,
      activeFlightViews,
      aircraftRegistry,
      organizationFilterId,
    ],
  );

  const filteredAircraft = useMemo(
    () =>
      isCommand
        ? filterAircraftByOrganization(aircraftRegistry, organizationFilterId)
        : aircraftRegistry,
    [isCommand, aircraftRegistry, organizationFilterId],
  );

  const organizationSummaries = useMemo(
    () =>
      isCommand
        ? buildOrganizationMapSummaries(aircraftRegistry, activeFlightViews)
        : [],
    [isCommand, aircraftRegistry, activeFlightViews],
  );

  const model = useMemo(
    () =>
      buildOperationsMapModel(
        users,
        filteredFlights,
        archivedFlights,
        filteredAircraft,
        now,
        incidentReports,
      ),
    [users, filteredFlights, archivedFlights, filteredAircraft, now, incidentReports],
  );

  const selectedInsight: StateMapInsight | null = selectedFips
    ? model.stateInsights.get(selectedFips) ?? null
    : null;

  const effectiveCommandStats = useMemo(() => {
    if (!isCommand) return commandStats ?? null;
    return buildCommandMapStats(
      users,
      filteredFlights,
      archivedFlights,
      filteredAircraft,
      now,
      incidentReports,
    );
  }, [
    isCommand,
    commandStats,
    users,
    filteredFlights,
    archivedFlights,
    filteredAircraft,
    now,
    incidentReports,
  ]);

  const selectedRegionStats =
    isCommand && selectedZone && effectiveCommandStats
      ? effectiveCommandStats.regions[selectedZone]
      : null;

  const hoveredInsight: StateMapInsight | null = hovered
    ? model.stateInsights.get(hovered.fips) ?? null
    : null;

  useEffect(() => {
    let cancelled = false;

    fetchUsStatesTopology()
      .then((topology) => {
        if (cancelled) return;
        setProjectedStates(
          projectStatePaths(topology, DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT),
        );
        setMapError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setMapError("Unable to load map geography.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectFips = useCallback(
    (fips: string) => {
      if (isCommand && effectiveCommandStats) {
        const insight = model.stateInsights.get(fips);
        if (insight) {
          setSelectedZone(insight.zone);
          setSelectedFips(null);
          return;
        }
      }
      setSelectedFips((current) => (current === fips ? null : fips));
      setSelectedZone(null);
    },
    [isCommand, effectiveCommandStats, model.stateInsights],
  );

  const handleSelectZone = useCallback((zone: MonitoringZone) => {
    setSelectedZone((current) => (current === zone ? null : zone));
    setSelectedFips(null);
  }, []);

  const handleHover = useCallback((fips: string, event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered({
      fips,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const handleHoverEnd = useCallback(() => setHovered(null), []);

  return (
    <section
      className={
        isCommand
          ? `flex h-full min-h-0 flex-col bg-slate-950 ${className}`
          : `relative overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-950 shadow-2xl shadow-black/40 ${className}`
      }
    >
      <div
        className={
          isCommand
            ? "shrink-0 border-b border-slate-800/80 bg-slate-900/60 px-3 py-1.5 sm:px-4"
            : "border-b border-slate-800/80 bg-slate-900/60 px-4 py-3 sm:px-5"
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {!isCommand ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
                  Live coverage
                </p>
                <h2 className="text-lg font-bold text-slate-50">
                  CONUS Operations Map
                </h2>
              </>
            ) : (
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400/90">
                CONUS traffic heatmap
              </h2>
            )}
            {!isCommand ? (
              <p className="text-xs text-slate-500">
                Operator regions · active aircraft · real-time status
              </p>
            ) : null}
          </div>
          <ul
            className={`flex flex-wrap gap-2 text-slate-400 ${isCommand ? "text-[10px]" : "text-xs"}`}
          >
            {model.operators.map((operator) => (
              <li key={operator.id} className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="size-2 rounded-full shadow-[0_0_6px_currentColor]"
                  style={{ backgroundColor: operator.color, color: operator.color }}
                  aria-hidden
                />
                {operator.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isCommand && organizationSummaries.length > 0 ? (
        <div className="shrink-0 border-b border-slate-800/80 px-3 py-2 sm:px-4">
          <OrganizationMapFilter
            summaries={organizationSummaries}
            selectedOrganizationId={organizationFilterId}
            onSelectOrganizationId={setOrganizationFilterId}
          />
        </div>
      ) : null}

      <div
        ref={containerRef}
        className={`relative min-h-0 bg-[#020617] ${isCommand ? "flex-1" : ""}`}
        style={
          isCommand
            ? undefined
            : { aspectRatio: `${DEFAULT_MAP_WIDTH} / ${DEFAULT_MAP_HEIGHT}` }
        }
      >
        <div className="occ-map-grid pointer-events-none absolute inset-0 opacity-40" />

        {mapError ? (
          <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-500">
            {mapError}
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${DEFAULT_MAP_WIDTH} ${DEFAULT_MAP_HEIGHT}`}
            overflow="visible"
            className="relative z-10 h-full w-full overflow-visible"
            role="img"
            aria-label="United States operator monitoring map"
          >
            <defs>
              <filter id="state-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <MapStatePathsLayer
              projectedStates={projectedStates}
              stateInsights={model.stateInsights}
              selectedFips={selectedFips}
              hoveredFips={hovered?.fips ?? null}
              onHover={handleHover}
              onHoverEnd={handleHoverEnd}
              onSelectFips={handleSelectFips}
            />

            {isCommand ? (
              <MapStateCountLayer
                projectedStates={projectedStates}
                stateCounts={model.stateCounts}
              />
            ) : (
              <MapMarkersLayer markers={model.markers} projection={projection} />
            )}
          </svg>
        )}

        {hoveredInsight && hovered ? (
          <div
            className="pointer-events-none absolute z-30 max-w-xs rounded-lg border border-cyan-500/30 bg-slate-950/95 px-3 py-2 text-xs shadow-lg shadow-cyan-500/10"
            style={{
              left: Math.min(
                hovered.x + 12,
                (containerRef.current?.clientWidth ?? 300) - 220,
              ),
              top: Math.max(hovered.y - 8, 8),
            }}
          >
            <p className="font-semibold text-cyan-300">
              {hoveredInsight.abbr} · {hoveredInsight.zone}
            </p>
            <p className="mt-1 text-slate-400">
              {hoveredInsight.operators.map((o) => o.name).join(", ") || "Unassigned"}
            </p>
            <p className="mt-1 text-slate-500">
              {hoveredInsight.aircraftCount} active in state ·{" "}
              {hoveredInsight.statusSummary.enRoute} en route ·{" "}
              {hoveredInsight.alertCount} alerts
            </p>
          </div>
        ) : null}

        {isCommand ? (
          <CommandRegionDetailPanel
            stats={selectedRegionStats}
            onClose={() => setSelectedZone(null)}
          />
        ) : (
          <OperatorMapSidePanel
            insight={selectedInsight}
            onClose={() => setSelectedFips(null)}
          />
        )}
      </div>

      {isCommand && effectiveCommandStats ? (
        <RegionStatsBar
          commandStats={effectiveCommandStats}
          selectedZone={selectedZone}
          onSelectZone={handleSelectZone}
        />
      ) : (
        <div className="grid grid-cols-3 gap-2 border-t border-slate-800/80 bg-slate-900/40 px-4 py-3 text-center text-[10px] uppercase tracking-wider text-slate-500 sm:text-xs">
          {GEOGRAPHIC_ZONE_ORDER.map((zoneKey) => {
            const zone = model.zoneSummaries.find((entry) => entry.zone === zoneKey);
            if (!zone) return null;
            const style = ZONE_MAP_STYLES[zoneKey];
            return (
              <div key={zone.zone}>
                <span className="inline-flex items-center justify-center gap-1.5 font-semibold text-slate-400">
                  <span
                    className="size-2 rounded-full shadow-[0_0_6px_currentColor]"
                    style={{ backgroundColor: style.glow, color: style.glow }}
                    aria-hidden
                  />
                  {zone.zone}
                </span>
                <span className="mt-0.5 block text-slate-600">
                  {zone.aircraftCount} active · {zone.operators.length} ops
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
