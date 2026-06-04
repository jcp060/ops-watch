import { DEFAULT_MAP_HEIGHT, DEFAULT_MAP_WIDTH, type ProjectedState } from "./us-map-geo";

export type StateLabelPlacement = {
  centroid: [number, number];
  label: [number, number];
  useLeader: boolean;
};

const MAP_CENTER: [number, number] = [
  DEFAULT_MAP_WIDTH / 2,
  DEFAULT_MAP_HEIGHT / 2,
];

/** Pixel thresholds — states smaller than this use an external label + leader line. */
const LEADER_MAX_DIMENSION = 40;
const LEADER_MAX_AREA = 1500;
const LEADER_LENGTH = 48;

/** Fine-tuned label offsets for congested northeast / mid-Atlantic states. */
const LEADER_OFFSETS: Record<string, [number, number]> = {
  "34": [54, -16], // NJ
  "44": [68, -22], // RI
};

/** MD, DC, DE — one vertical column of leader labels (top → bottom). */
const MID_ATLANTIC_STACK_FIPS = ["24", "11", "10"] as const;
const STACK_LINE_HEIGHT = 14;
const STACK_ANCHOR_OFFSET: [number, number] = [58, -18];

/** On-map labels only — skip leader lines despite small projected bounds. */
const INLINE_LABEL_FIPS = new Set(["09", "25", "33", "50"]); // CT, MA, NH, VT

const STACKED_LEADER_FIPS = new Set<string>(MID_ATLANTIC_STACK_FIPS);

function resolveMidAtlanticStackPlacements(
  projectedStates: ProjectedState[],
): Map<string, StateLabelPlacement> {
  const byFips = new Map(projectedStates.map((state) => [state.fips, state]));
  const stackStates = MID_ATLANTIC_STACK_FIPS.map((fips) => byFips.get(fips)).filter(
    (state): state is ProjectedState => state != null,
  );
  const placements = new Map<string, StateLabelPlacement>();
  if (stackStates.length === 0) return placements;

  const anchorX =
    Math.max(...stackStates.map((state) => state.centroid[0])) +
    STACK_ANCHOR_OFFSET[0];
  const anchorY =
    stackStates.reduce((sum, state) => sum + state.centroid[1], 0) /
      stackStates.length +
    STACK_ANCHOR_OFFSET[1];

  for (const [index, fips] of MID_ATLANTIC_STACK_FIPS.entries()) {
    const state = byFips.get(fips);
    if (!state) continue;
    placements.set(fips, {
      centroid: state.centroid,
      label: [anchorX, anchorY + index * STACK_LINE_HEIGHT],
      useLeader: true,
    });
  }

  return placements;
}

function isCrampedState(state: ProjectedState): boolean {
  if (INLINE_LABEL_FIPS.has(state.fips)) return false;
  if (STACKED_LEADER_FIPS.has(state.fips)) return true;
  if (LEADER_OFFSETS[state.fips]) return true;
  return (
    state.boundsWidth < LEADER_MAX_DIMENSION ||
    state.boundsHeight < LEADER_MAX_DIMENSION ||
    state.boundsWidth * state.boundsHeight < LEADER_MAX_AREA
  );
}

export function resolveStateLabelPlacement(
  state: ProjectedState,
): StateLabelPlacement {
  const centroid = state.centroid;

  if (!isCrampedState(state)) {
    return { centroid, label: centroid, useLeader: false };
  }

  const override = LEADER_OFFSETS[state.fips];
  if (override) {
    const label: [number, number] = [
      centroid[0] + override[0],
      centroid[1] + override[1],
    ];
    return { centroid, label, useLeader: true };
  }

  const [cx, cy] = centroid;
  let dx = cx - MAP_CENTER[0];
  let dy = cy - MAP_CENTER[1];
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;

  const label: [number, number] = [
    cx + dx * LEADER_LENGTH,
    cy + dy * LEADER_LENGTH,
  ];

  return { centroid, label, useLeader: true };
}

export function buildStateLabelPlacements(
  projectedStates: ProjectedState[],
): Map<string, StateLabelPlacement> {
  const stackPlacements = resolveMidAtlanticStackPlacements(projectedStates);
  const placements = new Map<string, StateLabelPlacement>();

  for (const state of projectedStates) {
    const stacked = stackPlacements.get(state.fips);
    placements.set(
      state.fips,
      stacked ?? resolveStateLabelPlacement(state),
    );
  }

  return placements;
}

/** Leader-line labels: active count + USPS abbreviation. */
export function formatStateCountLabel(
  count: number,
  abbr: string | null,
  useLeader: boolean,
): string {
  if (useLeader && abbr) return `${count}, ${abbr}`;
  return String(count);
}
