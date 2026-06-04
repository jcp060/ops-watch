import { getArchivedAt } from "./archive-retention";
import { normalizeVerificationOutcome } from "./verification";
import type {
  ArchivedFlight,
  MonitoringZone,
  VerificationOutcome,
  VerificationRecord,
} from "./types";
import { VERIFICATION_OUTCOMES } from "./types";

export const ARCHIVE_STORAGE_KEY = "sentinel-occ:archived-flights";

const MONITORING_ZONES: MonitoringZone[] = ["East", "Central", "West"];

function isMonitoringZone(value: unknown): value is MonitoringZone {
  return (
    typeof value === "string" &&
    MONITORING_ZONES.includes(value as MonitoringZone)
  );
}

function isStoredVerificationOutcome(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (value === "Still Flying" ||
      VERIFICATION_OUTCOMES.includes(value as VerificationOutcome))
  );
}

function normalizeVerificationHistory(value: unknown): VerificationRecord[] {
  if (!Array.isArray(value)) return [];
  const result: VerificationRecord[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.performedByUserId !== "string" ||
      typeof row.timestamp !== "number" ||
      typeof row.employeeAction !== "string" ||
      !isStoredVerificationOutcome(row.outcome) ||
      typeof row.notes !== "string"
    ) {
      continue;
    }
    result.push({
      id: row.id,
      performedByUserId: row.performedByUserId,
      timestamp: row.timestamp,
      employeeAction: row.employeeAction,
      outcome: normalizeVerificationOutcome(row.outcome),
      notes: row.notes,
    });
  }
  return result;
}

function isValidArchivedFlightRow(value: unknown): value is ArchivedFlight {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const history = row.verificationHistory;
  const archivedAt = row.archivedAt;
  const landingTime = row.landingTime;
  const hasArchivedAt =
    typeof archivedAt === "number" && Number.isFinite(archivedAt);
  const hasLandingOnly =
    !hasArchivedAt &&
    typeof landingTime === "number" &&
    Number.isFinite(landingTime);

  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    (row.sourceFlightId === undefined || typeof row.sourceFlightId === "string") &&
    typeof row.aircraftId === "string" &&
    typeof row.tailNumber === "string" &&
    typeof row.aircraftType === "string" &&
    (typeof row.organizationName === "string" ||
      typeof row.operator === "string") &&
    isMonitoringZone(row.monitoringZone) &&
    typeof row.flightStartTime === "number" &&
    Number.isFinite(row.flightStartTime) &&
    typeof landingTime === "number" &&
    Number.isFinite(landingTime) &&
    (hasArchivedAt || hasLandingOnly) &&
    isStoredVerificationOutcome(row.finalStatus) &&
    Array.isArray(history)
  );
}

function normalizeArchivedFlight(value: unknown): ArchivedFlight | null {
  if (!isValidArchivedFlightRow(value)) return null;
  const row = value as Record<string, unknown>;
  const legacyOperator =
    typeof row.operator === "string" ? row.operator.trim() : "";
  const organizationName =
    typeof row.organizationName === "string"
      ? row.organizationName.trim()
      : legacyOperator;
  const archivedAt =
    typeof row.archivedAt === "number" && Number.isFinite(row.archivedAt)
      ? row.archivedAt
      : (row.landingTime as number);
  const normalized: ArchivedFlight = {
    id: row.id as string,
    sourceFlightId:
      typeof row.sourceFlightId === "string" ? row.sourceFlightId : undefined,
    aircraftId: row.aircraftId as string,
    tailNumber: row.tailNumber as string,
    aircraftType: row.aircraftType as string,
    organizationName,
    homeState:
      typeof row.homeState === "string" ? row.homeState.toUpperCase() : "",
    monitoringZone: row.monitoringZone as ArchivedFlight["monitoringZone"],
    flightStartTime: row.flightStartTime as number,
    landingTime: row.landingTime as number,
    archivedAt,
    finalStatus: normalizeVerificationOutcome(row.finalStatus),
    verificationHistory: normalizeVerificationHistory(row.verificationHistory),
  };
  return { ...normalized, archivedAt: getArchivedAt(normalized) };
}

export function parsePersistedArchive(raw: string): ArchivedFlight[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const registry = parsed
      .map(normalizeArchivedFlight)
      .filter((row): row is ArchivedFlight => row !== null);
    if (registry.length === 0 && parsed.length > 0) return null;
    return registry;
  } catch {
    return null;
  }
}

export function loadArchiveFromStorage(): ArchivedFlight[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
  if (!raw) return null;
  return parsePersistedArchive(raw);
}

export function saveArchiveToStorage(archivedFlights: ArchivedFlight[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archivedFlights));
}
