import type { ActiveFlightSession, Aircraft, ArchivedFlight } from "./types";

/** One-time app bootstrap — starts with an empty aircraft registry. */
export function createInitialAircraftRegistry(): Aircraft[] {
  return [];
}

/** One-time app bootstrap — starts with no active flight sessions. */
export function createInitialActiveFlightSessions(): ActiveFlightSession[] {
  return [];
}

/** One-time app bootstrap — starts with no archived flights. */
export function createInitialArchivedFlights(): ArchivedFlight[] {
  return [];
}
