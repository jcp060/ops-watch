import { geoAlbersUsa, geoCentroid, geoPath } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection } from "geojson";
import { STATE_FIPS_TO_ABBR } from "./us-state-zones";

export const US_STATES_TOPOLOGY_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export const DEFAULT_MAP_WIDTH = 960;
export const DEFAULT_MAP_HEIGHT = 560;

type UsStatesTopology = {
  objects: {
    states: Parameters<typeof feature>[1];
  };
};

export type ProjectedState = {
  fips: string;
  path: string;
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
  boundsWidth: number;
  boundsHeight: number;
};

export function createUsMapProjection(
  width = DEFAULT_MAP_WIDTH,
  height = DEFAULT_MAP_HEIGHT,
): GeoProjection {
  return geoAlbersUsa()
    .scale(width * 1.15)
    .translate([width / 2, height / 2]);
}

export function projectLngLat(
  projection: GeoProjection,
  coordinates: [number, number],
): [number, number] {
  const projected = projection(coordinates);
  return (projected ?? [DEFAULT_MAP_WIDTH / 2, DEFAULT_MAP_HEIGHT / 2]) as [
    number,
    number,
  ];
}

export async function fetchUsStatesTopology(): Promise<UsStatesTopology> {
  const response = await fetch(US_STATES_TOPOLOGY_URL);
  if (!response.ok) {
    throw new Error("Failed to load US states map data.");
  }
  return (await response.json()) as UsStatesTopology;
}

export function projectStatePaths(
  topology: UsStatesTopology,
  width: number,
  height: number,
): ProjectedState[] {
  const states = feature(
    topology as unknown as Parameters<typeof feature>[0],
    topology.objects.states,
  ) as FeatureCollection;

  const projection = createUsMapProjection(width, height);
  const pathGenerator = geoPath(projection);

  return states.features
    .filter((stateFeature) => {
      const fips = String(stateFeature.id ?? "");
      return fips in STATE_FIPS_TO_ABBR;
    })
    .map((stateFeature) => {
    const fips = String(stateFeature.id ?? "");
    const path = pathGenerator(stateFeature);
    const centroid = geoCentroid(stateFeature);
    const projected = projection(centroid) ?? [width / 2, height / 2];

    const bounds = pathGenerator.bounds(stateFeature) as [
      [number, number],
      [number, number],
    ];
    const boundsWidth = bounds[1][0] - bounds[0][0];
    const boundsHeight = bounds[1][1] - bounds[0][1];

    return {
      fips,
      path: path ?? "",
      centroid: projected as [number, number],
      bounds,
      boundsWidth,
      boundsHeight,
    };
  });
}
