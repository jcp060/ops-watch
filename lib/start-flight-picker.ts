import { getAvailableAircraft } from "./active-flights";
import type { ActiveFlightSession, Aircraft, EntityStatus } from "./types";

export type StartFlightAvailability = "ready" | "inactive";

export type StartFlightPickerRow = {
  aircraft: Aircraft;
  availability: StartFlightAvailability;
  availabilityLabel: string;
};

export function getStartFlightAvailability(
  status: EntityStatus,
): StartFlightAvailability {
  return status === "Active" ? "ready" : "inactive";
}

export function getStartFlightAvailabilityLabel(
  availability: StartFlightAvailability,
): string {
  return availability === "ready" ? "Ready" : "Inactive";
}

/** Available aircraft rows for Start Flight (not in an active session). */
export function buildStartFlightPickerRows(
  registry: Aircraft[],
  activeFlights: ActiveFlightSession[],
): StartFlightPickerRow[] {
  return getAvailableAircraft(registry, activeFlights).map((aircraft) => {
    const availability = getStartFlightAvailability(aircraft.status);
    return {
      aircraft,
      availability,
      availabilityLabel: getStartFlightAvailabilityLabel(availability),
    };
  });
}
