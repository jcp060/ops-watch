"use client";

import { memo } from "react";
import type { GeoProjection } from "d3-geo";
import type { MapAircraftMarker } from "@/lib/operator-map-data";
import { projectLngLat } from "@/lib/us-map-geo";

const MARKER_COLORS = {
  ACTIVE: "#34d399",
  WARNING: "#fbbf24",
  OVERDUE: "#f87171",
} as const;

type MapMarkersLayerProps = {
  markers: MapAircraftMarker[];
  projection: GeoProjection;
};

export const MapMarkersLayer = memo(
  function MapMarkersLayer({ markers, projection }: MapMarkersLayerProps) {
    return (
      <g className="pointer-events-none" aria-hidden>
        {markers.map((marker) => {
          const point = projectLngLat(projection, marker.coordinates);
          const color = MARKER_COLORS[marker.status];

          return (
            <g key={marker.id} transform={`translate(${point[0]}, ${point[1]})`}>
              <circle r={10} fill={color} opacity={0.2} />
              <circle r={5} fill={color} stroke="#0f172a" strokeWidth={1.5} />
              <circle r={2} fill="#f8fafc" />
            </g>
          );
        })}
      </g>
    );
  },
  (prev, next) => prev.markers === next.markers && prev.projection === next.projection,
);
