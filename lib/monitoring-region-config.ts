import type { MonitoringZone } from "./types";

/**
 * Source of truth for USPS state/territory → OCC monitoring zone.
 * Edit zone membership here; map, stats, and aircraft zones derive from this file.
 */
export const MONITORING_REGION_CONFIG = {
  West: [
    "AK",
    "HI",
    "WA",
    "OR",
    "CA",
    "NV",
    "ID",
    "MT",
    "WY",
    "UT",
    "AZ",
    "CO",
    "NM",
  ],
  Central: [
    "ND",
    "SD",
    "NE",
    "KS",
    "OK",
    "TX",
    "MN",
    "IA",
    "MO",
    "AR",
    "LA",
    "WI",
    "IL",
    "MI",
    "IN",
    "OH",
    "KY",
    "TN",
    "AL",
    "MS",
  ],
  East: [
    "GA",
    "FL",
    "SC",
    "NC",
    "VA",
    "WV",
    "PA",
    "NY",
    "VT",
    "NH",
    "ME",
    "MA",
    "RI",
    "CT",
    "NJ",
    "DE",
    "MD",
    "DC",
  ],
} as const satisfies Record<MonitoringZone, readonly string[]>;

export const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/** Built once from {@link MONITORING_REGION_CONFIG}. */
export const STATE_ABBR_TO_ZONE: Record<string, MonitoringZone> =
  Object.fromEntries(
    (Object.entries(MONITORING_REGION_CONFIG) as [MonitoringZone, readonly string[]][]).flatMap(
      ([zone, abbreviations]) =>
        abbreviations.map((abbr) => [abbr, zone] as const),
    ),
  ) as Record<string, MonitoringZone>;

export const US_STATE_SELECT_OPTIONS = (
  Object.keys(US_STATE_NAMES) as string[]
)
  .filter((abbr) => STATE_ABBR_TO_ZONE[abbr])
  .map((abbr) => ({
    abbr,
    name: US_STATE_NAMES[abbr],
    zone: STATE_ABBR_TO_ZONE[abbr],
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function isKnownStateAbbr(abbr: string): boolean {
  return abbr.toUpperCase() in STATE_ABBR_TO_ZONE;
}

export function getZoneForStateAbbr(abbr: string): MonitoringZone | null {
  return STATE_ABBR_TO_ZONE[abbr.toUpperCase()] ?? null;
}

/** Apply current region config to an aircraft record (zone follows home state). */
export function reconcileAircraftMonitoringZone<
  T extends { homeState: string; monitoringZone: MonitoringZone },
>(aircraft: T): T {
  const zone = getZoneForStateAbbr(aircraft.homeState);
  if (!zone) return aircraft;
  if (aircraft.monitoringZone === zone) return aircraft;
  return { ...aircraft, monitoringZone: zone };
}

/** Legacy records without homeState: assign a representative state, then reconcile zone. */
const LEGACY_ZONE_DEFAULT_STATE: Record<MonitoringZone, string> = {
  West: "CA",
  Central: "TX",
  East: "GA",
};

export function migrateAircraftHomeState<
  T extends { homeState?: string; monitoringZone: MonitoringZone },
>(aircraft: T): T & { homeState: string; monitoringZone: MonitoringZone } {
  const homeState =
    aircraft.homeState && isKnownStateAbbr(aircraft.homeState)
      ? aircraft.homeState.toUpperCase()
      : LEGACY_ZONE_DEFAULT_STATE[aircraft.monitoringZone];

  return reconcileAircraftMonitoringZone({
    ...aircraft,
    homeState,
    monitoringZone: aircraft.monitoringZone,
  });
}
