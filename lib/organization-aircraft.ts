import type { Aircraft, ActiveFlight, MonitoringZone, Organization } from "./types";
import { GEOGRAPHIC_ZONE_ORDER } from "./monitoring-zones";

export type OrganizationFleetStats = {
  totalAircraft: number;
  activeInFlight: number;
  byZone: Record<MonitoringZone, number>;
  aircraft: Aircraft[];
};

export function countAircraftForOrganization(
  aircraft: Aircraft[],
  organizationId: string,
): number {
  return aircraft.filter((entry) => entry.organizationId === organizationId)
    .length;
}

export function buildOrganizationFleetStats(
  organizationId: string,
  aircraft: Aircraft[],
  activeFlights: ActiveFlight[],
): OrganizationFleetStats {
  const fleet = aircraft.filter(
    (entry) => entry.organizationId === organizationId,
  );
  const inFlightIds = new Set(
    activeFlights.map((flight) => flight.aircraftId),
  );

  const byZone = Object.fromEntries(
    GEOGRAPHIC_ZONE_ORDER.map((zone) => [zone, 0]),
  ) as Record<MonitoringZone, number>;

  let activeInFlight = 0;
  for (const entry of fleet) {
    byZone[entry.monitoringZone] += 1;
    if (inFlightIds.has(entry.id)) activeInFlight += 1;
  }

  return {
    totalAircraft: fleet.length,
    activeInFlight,
    byZone,
    aircraft: fleet.sort((a, b) => a.tailNumber.localeCompare(b.tailNumber)),
  };
}

/** Apply organization defaults to aircraft form fields (user may override after). */
export function contactsFromOrganization(org: Organization): Pick<
  Aircraft,
  | "organizationId"
  | "organizationName"
  | "primaryContactName"
  | "primaryContactPhone"
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "email"
> {
  return {
    organizationId: org.id,
    organizationName: org.organizationName,
    primaryContactName: org.primaryContactName,
    primaryContactPhone: org.primaryContactPhone,
    emergencyContactName: org.emergencyContactName,
    emergencyContactPhone: org.emergencyContactPhone,
    email: org.email,
  };
}

export function clearOrganizationFromAircraft(): Pick<
  Aircraft,
  | "organizationId"
  | "organizationName"
  | "primaryContactName"
  | "primaryContactPhone"
  | "email"
> {
  return {
    organizationId: "",
    organizationName: "",
    primaryContactName: "",
    primaryContactPhone: "",
    email: "",
  };
}

export function resolveOrganizationForAircraft(
  aircraft: Aircraft,
  registry: Organization[],
): Organization | undefined {
  if (!aircraft.organizationId) return undefined;
  return registry.find((org) => org.id === aircraft.organizationId);
}

export type OrganizationMapSummary = {
  organizationId: string;
  organizationName: string;
  activeCount: number;
  zones: MonitoringZone[];
};

export function buildOrganizationMapSummaries(
  aircraft: Aircraft[],
  activeFlights: ActiveFlight[],
): OrganizationMapSummary[] {
  const inFlightByAircraft = new Set(
    activeFlights.map((flight) => flight.aircraftId),
  );

  const counts = new Map<
    string,
    { name: string; count: number; zones: Set<MonitoringZone> }
  >();

  for (const flight of activeFlights) {
    const aircraftEntry = aircraft.find((a) => a.id === flight.aircraftId);
    if (!aircraftEntry?.organizationId) continue;
    const bucket = counts.get(aircraftEntry.organizationId) ?? {
      name: aircraftEntry.organizationName || "Unknown organization",
      count: 0,
      zones: new Set<MonitoringZone>(),
    };
    bucket.count += 1;
    bucket.zones.add(flight.monitoringZone);
    counts.set(aircraftEntry.organizationId, bucket);
  }

  for (const entry of aircraft) {
    if (!entry.organizationId || inFlightByAircraft.has(entry.id)) continue;
    if (!counts.has(entry.organizationId)) continue;
  }

  return [...counts.entries()]
    .map(([organizationId, data]) => ({
      organizationId,
      organizationName: data.name,
      activeCount: data.count,
      zones: [...data.zones],
    }))
    .sort((a, b) => b.activeCount - a.activeCount);
}

export function filterFlightsByOrganization(
  flights: ActiveFlight[],
  aircraft: Aircraft[],
  organizationId: string | null,
): ActiveFlight[] {
  if (!organizationId) return flights;
  const byAircraftId = new Map(aircraft.map((a) => [a.id, a]));
  return flights.filter((flight) => {
    const entry = byAircraftId.get(flight.aircraftId);
    return entry?.organizationId === organizationId;
  });
}

export function filterAircraftByOrganization(
  aircraft: Aircraft[],
  organizationId: string | null,
): Aircraft[] {
  if (!organizationId) return aircraft;
  return aircraft.filter((entry) => entry.organizationId === organizationId);
}
