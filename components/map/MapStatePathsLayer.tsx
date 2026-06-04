"use client";

import { memo } from "react";
import type { OperationsMapModel } from "@/lib/operator-map-data";
import type { ProjectedState } from "@/lib/us-map-geo";

type MapStatePathsLayerProps = {
  projectedStates: ProjectedState[];
  stateInsights: OperationsMapModel["stateInsights"];
  selectedFips: string | null;
  hoveredFips: string | null;
  onHover: (fips: string, event: React.MouseEvent) => void;
  onHoverEnd: () => void;
  onSelectFips: (fips: string) => void;
};

export const MapStatePathsLayer = memo(
  function MapStatePathsLayer({
    projectedStates,
    stateInsights,
    selectedFips,
    hoveredFips,
    onHover,
    onHoverEnd,
    onSelectFips,
  }: MapStatePathsLayerProps) {
    return (
      <>
        {projectedStates.map((state) => {
          const insight = stateInsights.get(state.fips);
          const isSelected = selectedFips === state.fips;
          const isHovered = hoveredFips === state.fips;

          return (
            <path
              key={state.fips}
              d={state.path}
              fill={insight?.fill ?? "rgba(15, 23, 42, 0.75)"}
              stroke={insight?.stroke ?? "rgba(51, 65, 85, 0.6)"}
              strokeWidth={isSelected || isHovered ? 1.8 : 0.9}
              filter={insight ? "url(#state-glow)" : undefined}
              className="cursor-pointer transition-[fill,stroke,opacity] duration-200"
              style={{ opacity: isHovered || isSelected ? 1 : 0.92 }}
              onMouseEnter={(event) => onHover(state.fips, event)}
              onMouseMove={(event) => onHover(state.fips, event)}
              onMouseLeave={onHoverEnd}
              onClick={() => onSelectFips(state.fips)}
            />
          );
        })}
      </>
    );
  },
  (prev, next) =>
    prev.projectedStates === next.projectedStates &&
    prev.stateInsights === next.stateInsights &&
    prev.selectedFips === next.selectedFips &&
    prev.hoveredFips === next.hoveredFips,
);
