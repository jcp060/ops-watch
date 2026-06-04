import { cloneAircraft } from "@/lib/aircraft-registry";
import type {
  ActiveFlight,
  ActiveFlightSession,
  Aircraft,
} from "@/lib/types";
import type { VerificationRecord } from "@/lib/types";
import { createUniqueId } from "@/lib/unique-id";

export function checkIntervalToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

export function createActiveFlightSessionFromAircraft(
  aircraft: Aircraft,
  now = Date.now(),
): ActiveFlightSession {
  const checkIntervalMs = checkIntervalToMs(aircraft.checkIntervalMinutes);
  return {
    id: createUniqueId(),
    aircraftId: aircraft.id,
    checkIntervalMs,
    flightStartTime: now,
    dueAt: now + checkIntervalMs,
    lastVerifiedAt: now,
    verificationHistory: [],
  };
}

export function verifyActiveFlightSession(
  session: ActiveFlightSession,
  verifiedAt: number,
  record: VerificationRecord,
): ActiveFlightSession {
  return {
    ...session,
    lastVerifiedAt: verifiedAt,
    dueAt: verifiedAt + session.checkIntervalMs,
    verificationHistory: [...session.verificationHistory, record],
  };
}

export function updateActiveFlightSession(
  session: ActiveFlightSession,
  patch: Partial<Pick<ActiveFlightSession, "dueAt" | "lastVerifiedAt" | "verificationHistory">>,
): ActiveFlightSession {
  return { ...session, ...patch };
}

export function isAircraftInFlight(
  flights: ActiveFlightSession[],
  aircraftId: string,
): boolean {
  return flights.some((f) => f.aircraftId === aircraftId);
}

export function getAvailableAircraft(
  registry: Aircraft[],
  activeFlights: ActiveFlightSession[],
): Aircraft[] {
  const inFlightIds = new Set(activeFlights.map((f) => f.aircraftId));
  return registry.filter((a) => !inFlightIds.has(a.id));
}

/** Join active session with live aircraft registry for dashboard/modal display. */
export function resolveActiveFlightView(
  session: ActiveFlightSession,
  registry: Aircraft[],
): ActiveFlight | null {
  const aircraft = registry.find((a) => a.id === session.aircraftId);
  if (!aircraft) return null;
  const snapshot = cloneAircraft(aircraft);
  return {
    ...session,
    tailNumber: snapshot.tailNumber,
    aircraftType: snapshot.aircraftType,
    organizationId: snapshot.organizationId,
    organizationName: snapshot.organizationName,
    monitoringZone: snapshot.monitoringZone,
    primaryContactName: snapshot.primaryContactName,
    primaryContactPhone: snapshot.primaryContactPhone,
    emergencyContactName: snapshot.emergencyContactName,
    emergencyContactPhone: snapshot.emergencyContactPhone,
    email: snapshot.email,
  };
}

export function resolveActiveFlightViews(
  sessions: ActiveFlightSession[],
  registry: Aircraft[],
): ActiveFlight[] {
  const registryById = new Map(registry.map((a) => [a.id, a]));
  const views: ActiveFlight[] = [];
  for (const session of sessions) {
    const aircraft = registryById.get(session.aircraftId);
    if (!aircraft) continue;
    const snapshot = cloneAircraft(aircraft);
    views.push({
      ...session,
      tailNumber: snapshot.tailNumber,
      aircraftType: snapshot.aircraftType,
      organizationId: snapshot.organizationId,
      organizationName: snapshot.organizationName,
      monitoringZone: snapshot.monitoringZone,
      primaryContactName: snapshot.primaryContactName,
      primaryContactPhone: snapshot.primaryContactPhone,
      emergencyContactName: snapshot.emergencyContactName,
      emergencyContactPhone: snapshot.emergencyContactPhone,
      email: snapshot.email,
    });
  }
  return views;
}
