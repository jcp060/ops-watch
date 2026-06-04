import {
  createActiveFlightSessionFromAircraft,
  isAircraftInFlight,
  verifyActiveFlightSession,
} from "@/lib/active-flights";
import { linkEmergencyIncidentToSession } from "@/lib/flight-emergency";
import { createInitialActiveFlightSessions } from "@/lib/mock-aircraft";
import type {
  ActiveFlightSession,
  Aircraft,
  VerificationRecord,
} from "@/lib/types";

let sessions: ActiveFlightSession[] | null = null;
let storeInitialized = false;
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function defaultSessions(): ActiveFlightSession[] {
  return createInitialActiveFlightSessions();
}

function ensureSessions(): ActiveFlightSession[] {
  if (!storeInitialized || sessions === null) {
    sessions = defaultSessions();
    storeInitialized = true;
  }
  return sessions;
}

export function subscribeActiveFlights(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveFlightsSnapshot(): ActiveFlightSession[] {
  return ensureSessions();
}

export function getActiveFlightsServerSnapshot(): ActiveFlightSession[] {
  return defaultSessions();
}

export function commitActiveFlights(
  next: ActiveFlightSession[],
): ActiveFlightSession[] {
  const current = ensureSessions();
  if (next === current) {
    return current;
  }
  sessions = next;
  storeInitialized = true;
  emitChange();
  return sessions;
}

export function startFlightInStore(
  current: ActiveFlightSession[],
  aircraft: Aircraft,
): { sessions: ActiveFlightSession[]; session: ActiveFlightSession } | null {
  if (isAircraftInFlight(current, aircraft.id)) return null;
  const session = createActiveFlightSessionFromAircraft(aircraft);
  return {
    sessions: commitActiveFlights([...current, session]),
    session,
  };
}

export function verifyFlightInStore(
  current: ActiveFlightSession[],
  flightId: string,
  verifiedAt: number,
  record: VerificationRecord,
): ActiveFlightSession[] {
  const next = current.map((session) =>
    session.id === flightId
      ? verifyActiveFlightSession(session, verifiedAt, record)
      : session,
  );
  return commitActiveFlights(next);
}

export function removeFlightInStore(
  current: ActiveFlightSession[],
  flightId: string,
): ActiveFlightSession[] {
  const next = current.filter((f) => f.id !== flightId);
  if (next.length === current.length) {
    return current;
  }
  return commitActiveFlights(next);
}

export function findActiveFlightById(
  current: ActiveFlightSession[],
  flightId: string,
): ActiveFlightSession | undefined {
  return current.find((f) => f.id === flightId);
}

export function linkEmergencyIncidentInStore(
  current: ActiveFlightSession[],
  flightId: string,
  verifiedAt: number,
  incidentReportId: string,
): ActiveFlightSession[] {
  const next = current.map((session) =>
    session.id === flightId
      ? linkEmergencyIncidentToSession(session, verifiedAt, incidentReportId)
      : session,
  );
  return commitActiveFlights(next);
}
