import { hasUniqueAircraftIds } from "./aircraft-registry";
import { normalizeEmergencyPhone } from "./emergency-contact";
import { migrateAircraftHomeState } from "./monitoring-region-config";
import type { Aircraft, EntityStatus, MonitoringZone } from "./types";

export const AIRCRAFT_REGISTRY_STORAGE_KEY = "sentinel-occ:aircraft-registry";

const MONITORING_ZONES: MonitoringZone[] = ["East", "Central", "West"];
const ENTITY_STATUSES: EntityStatus[] = ["Active", "Inactive"];

function isMonitoringZone(value: unknown): value is MonitoringZone {
  return (
    typeof value === "string" &&
    MONITORING_ZONES.includes(value as MonitoringZone)
  );
}

function isEntityStatus(value: unknown): value is EntityStatus {
  return (
    typeof value === "string" &&
    ENTITY_STATUSES.includes(value as EntityStatus)
  );
}

function isValidAircraftRow(value: unknown): value is Omit<Aircraft, "homeState"> & {
  homeState?: string;
} {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.tailNumber === "string" &&
    typeof row.aircraftType === "string" &&
    isMonitoringZone(row.monitoringZone) &&
    typeof row.checkIntervalMinutes === "number" &&
    Number.isFinite(row.checkIntervalMinutes) &&
    row.checkIntervalMinutes > 0 &&
    isEntityStatus(row.status) &&
    (row.homeState === undefined || typeof row.homeState === "string") &&
    (row.organizationId === undefined || typeof row.organizationId === "string") &&
    (row.organizationName === undefined ||
      typeof row.organizationName === "string") &&
    (row.primaryContactName === undefined ||
      typeof row.primaryContactName === "string") &&
    (row.primaryContactPhone === undefined ||
      typeof row.primaryContactPhone === "string") &&
    (row.emergencyContactName === undefined ||
      typeof row.emergencyContactName === "string") &&
    (row.emergencyContactPhone === undefined ||
      typeof row.emergencyContactPhone === "string") &&
    (row.email === undefined || typeof row.email === "string")
  );
}

function normalizeAircraft(value: unknown): Aircraft | null {
  if (!value || typeof value !== "object") return null;
  const row = { ...(value as Record<string, unknown>) };
  if (
    typeof row.checkIntervalMinutes !== "number" ||
    !Number.isFinite(row.checkIntervalMinutes) ||
    row.checkIntervalMinutes <= 0
  ) {
    row.checkIntervalMinutes = 10;
  }
  if (!isValidAircraftRow(row)) return null;

  const raw = row as Record<string, unknown>;
  const legacyOperator =
    typeof raw.operator === "string" ? raw.operator.trim() : "";
  const organizationName =
    typeof row.organizationName === "string"
      ? row.organizationName.trim()
      : legacyOperator;

  return migrateAircraftHomeState({
    id: row.id as string,
    tailNumber: row.tailNumber as string,
    aircraftType: row.aircraftType as string,
    organizationId:
      typeof row.organizationId === "string" ? row.organizationId : "",
    organizationName,
    primaryContactName:
      typeof row.primaryContactName === "string"
        ? row.primaryContactName.trim()
        : "",
    primaryContactPhone: normalizeEmergencyPhone(
      typeof row.primaryContactPhone === "string" ? row.primaryContactPhone : "",
    ),
    homeState: typeof row.homeState === "string" ? row.homeState : undefined,
    monitoringZone: row.monitoringZone as MonitoringZone,
    checkIntervalMinutes: row.checkIntervalMinutes as number,
    status: row.status as EntityStatus,
    emergencyContactName:
      typeof row.emergencyContactName === "string"
        ? row.emergencyContactName.trim()
        : "",
    emergencyContactPhone: normalizeEmergencyPhone(
      typeof row.emergencyContactPhone === "string"
        ? row.emergencyContactPhone
        : "",
    ),
    email: typeof row.email === "string" ? row.email.trim() : "",
  });
}

export function parsePersistedAircraftRegistry(raw: string): Aircraft[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const registry = parsed
      .map(normalizeAircraft)
      .filter((row): row is Aircraft => row !== null);
    if (registry.length === 0 && parsed.length > 0) return null;
    if (!hasUniqueAircraftIds(registry)) return null;
    return registry;
  } catch {
    return null;
  }
}

export function loadAircraftRegistryFromStorage(): Aircraft[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AIRCRAFT_REGISTRY_STORAGE_KEY);
  if (!raw) return null;
  return parsePersistedAircraftRegistry(raw);
}

export function saveAircraftRegistryToStorage(registry: Aircraft[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    AIRCRAFT_REGISTRY_STORAGE_KEY,
    JSON.stringify(registry),
  );
}
