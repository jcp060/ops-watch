import {
  findActiveFlightById,
  getActiveFlightsSnapshot,
  removeFlightInStore,
  verifyFlightInStore,
} from "@/stores/active-flights-store";
import {
  archiveLandedFlight,
  getArchiveSnapshot,
} from "@/stores/archive-store";
import type {
  ActiveFlightSession,
  Aircraft,
  ArchivedFlight,
  VerificationOutcome,
  VerificationRecord,
} from "@/lib/types";
export type FleetStoresSnapshot = {
  aircraftRegistry: Aircraft[];
  activeFlights: ActiveFlightSession[];
  archivedFlights: ArchivedFlight[];
};

function findAircraftInRegistry(
  registry: Aircraft[],
  aircraftId: string,
): Aircraft | undefined {
  return registry.find((aircraft) => aircraft.id === aircraftId);
}

/** Landing: snapshot to archive, remove from active flights — single orchestrated action. */
export function landFlightInFleet(
  fleet: FleetStoresSnapshot,
  flightId: string,
  verifiedAt: number,
  record: VerificationRecord,
): FleetStoresSnapshot | null {
  const session = findActiveFlightById(fleet.activeFlights, flightId);
  if (!session) return null;

  const aircraft = findAircraftInRegistry(
    fleet.aircraftRegistry,
    session.aircraftId,
  );
  if (!aircraft) return null;

  archiveLandedFlight(
    fleet.archivedFlights,
    session,
    aircraft,
    verifiedAt,
    [...session.verificationHistory, record],
  );

  removeFlightInStore(fleet.activeFlights, flightId);

  return {
    ...fleet,
    activeFlights: getActiveFlightsSnapshot(),
    archivedFlights: getArchiveSnapshot(),
  };
}

export function verifyFlightInFleet(
  fleet: FleetStoresSnapshot,
  flightId: string,
  outcome: VerificationOutcome,
  _notes: string,
  verifiedAt: number,
  record: VerificationRecord,
): FleetStoresSnapshot | null {
  if (outcome === "Landed Safely") {
    return landFlightInFleet(fleet, flightId, verifiedAt, record);
  }

  const session = findActiveFlightById(fleet.activeFlights, flightId);
  if (!session) return null;

  verifyFlightInStore(fleet.activeFlights, flightId, verifiedAt, record);

  return {
    ...fleet,
    activeFlights: getActiveFlightsSnapshot(),
    archivedFlights: getArchiveSnapshot(),
  };
}
