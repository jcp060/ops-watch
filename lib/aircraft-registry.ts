import type { Aircraft } from "./types";

/** Shallow clone — each aircraft is a plain object with primitive fields. */
export function cloneAircraft(aircraft: Aircraft): Aircraft {
  return {
    id: aircraft.id,
    tailNumber: aircraft.tailNumber,
    aircraftType: aircraft.aircraftType,
    organizationId: aircraft.organizationId,
    organizationName: aircraft.organizationName,
    primaryContactName: aircraft.primaryContactName,
    primaryContactPhone: aircraft.primaryContactPhone,
    emergencyContactName: aircraft.emergencyContactName,
    emergencyContactPhone: aircraft.emergencyContactPhone,
    email: aircraft.email,
    homeState: aircraft.homeState,
    monitoringZone: aircraft.monitoringZone,
    checkIntervalMinutes: aircraft.checkIntervalMinutes,
    status: aircraft.status,
  };
}

/**
 * Immutable registry update by aircraft.id only — does not rebuild from mocks.
 */
export function updateAircraftInRegistry(
  registry: Aircraft[],
  aircraft: Aircraft,
  mode: "create" | "edit",
): Aircraft[] {
  const next = cloneAircraft(aircraft);

  if (mode === "create") {
    if (registry.some((a) => a.id === next.id)) return registry;
    return [...registry, next];
  }

  const index = registry.findIndex((a) => a.id === next.id);
  if (index === -1) return registry;

  return registry.map((a) => (a.id === next.id ? next : a));
}

export function deleteAircraftById(
  registry: Aircraft[],
  id: string,
): Aircraft[] {
  return registry.filter((a) => a.id !== id);
}

export function hasUniqueAircraftIds(registry: Aircraft[]): boolean {
  const seen = new Set<string>();
  for (const { id } of registry) {
    if (!id || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}
