import type {
  ActiveFlightSession,
  Aircraft,
  ArchivedFlight,
  VerificationOutcome,
  VerificationRecord,
} from "./types";
import { createUniqueId } from "./unique-id";

export function createArchivedFlightSnapshot(
  session: ActiveFlightSession,
  aircraft: Aircraft,
  landingTime: number,
  finalStatus: VerificationOutcome,
  verificationHistory: VerificationRecord[],
  archivedAt = Date.now(),
): ArchivedFlight {
  return {
    id: createUniqueId(),
    sourceFlightId: session.id,
    aircraftId: session.aircraftId,
    tailNumber: aircraft.tailNumber,
    aircraftType: aircraft.aircraftType,
    organizationName: aircraft.organizationName,
    homeState: aircraft.homeState,
    monitoringZone: aircraft.monitoringZone,
    flightStartTime: session.flightStartTime,
    landingTime,
    archivedAt,
    finalStatus,
    verificationHistory: verificationHistory.map((r) => ({ ...r })),
  };
}

export function prependUniqueArchivedFlight(
  archived: ArchivedFlight[],
  next: ArchivedFlight,
): ArchivedFlight[] {
  if (archived.some((f) => f.id === next.id)) return archived;
  if (
    next.sourceFlightId &&
    archived.some((f) => f.sourceFlightId === next.sourceFlightId)
  ) {
    return archived;
  }
  return [next, ...archived];
}
