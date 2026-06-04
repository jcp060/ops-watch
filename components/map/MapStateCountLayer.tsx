"use client";

import { memo, useMemo, useRef } from "react";
import {
  getStateCountTier,
  stateCountsSignature,
  type StateCountsModel,
} from "@/lib/state-aircraft-counts";
import {
  buildStateLabelPlacements,
  formatStateCountLabel,
} from "@/lib/state-label-layout";
import { getStateAbbrForFips } from "@/lib/us-state-zones";
import type { ProjectedState } from "@/lib/us-map-geo";

type MapStateCountLayerProps = {
  projectedStates: ProjectedState[];
  stateCounts: StateCountsModel;
};

export const MapStateCountLayer = memo(
  function MapStateCountLayer({
    projectedStates,
    stateCounts,
  }: MapStateCountLayerProps) {
    const prevSignatureRef = useRef<string>("");
    const prevCountsRef = useRef<Map<string, number>>(new Map());
    const signature = stateCountsSignature(stateCounts);
    const countsChanged = signature !== prevSignatureRef.current;

    const labelPlacements = useMemo(
      () => buildStateLabelPlacements(projectedStates),
      [projectedStates],
    );

    const pulseFips = new Set<string>();
    if (countsChanged) {
      for (const state of projectedStates) {
        const prev = prevCountsRef.current.get(state.fips) ?? 0;
        const next =
          stateCounts.byFips.get(state.fips)?.activeCount ?? 0;
        if (prev !== next) pulseFips.add(state.fips);
      }
      prevSignatureRef.current = signature;
      prevCountsRef.current = new Map(
        projectedStates.map((state) => [
          state.fips,
          stateCounts.byFips.get(state.fips)?.activeCount ?? 0,
        ]),
      );
    }

    return (
      <g className="pointer-events-none" aria-hidden>
        {projectedStates.map((state) => {
          if (!getStateAbbrForFips(state.fips)) return null;
          const metrics = stateCounts.byFips.get(state.fips);
          const count = metrics?.activeCount ?? 0;
          const tier = getStateCountTier(count);
          const abbr =
            metrics?.abbr ?? getStateAbbrForFips(state.fips) ?? null;
          const placement = labelPlacements.get(state.fips);
          if (!placement) return null;
          const [labelX, labelY] = placement.label;
          const labelText = formatStateCountLabel(
            count,
            abbr,
            placement.useLeader,
          );
          const fontSize = placement.useLeader
            ? 11
            : count >= 10
              ? 13
              : count > 0
                ? 15
                : 12;
          const pulse = pulseFips.has(state.fips);

          return (
            <g
              key={state.fips}
              className={`occ-state-count-group occ-state-count-glow-${tier}${
                placement.useLeader ? " occ-state-count-leader" : ""
              }${pulse ? " occ-state-count-pulse" : ""}`}
            >
              {placement.useLeader ? (
                <line
                  x1={placement.centroid[0]}
                  y1={placement.centroid[1]}
                  x2={labelX}
                  y2={labelY}
                  className="occ-state-leader"
                />
              ) : null}
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="central"
                className={`occ-state-count occ-state-count-${tier}`}
                style={{ fontSize }}
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </g>
    );
  },
  (prev, next) =>
    prev.projectedStates === next.projectedStates &&
    stateCountsSignature(prev.stateCounts) ===
      stateCountsSignature(next.stateCounts),
);
