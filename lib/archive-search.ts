import { getArchivedAt } from "./archive-retention";
import { datesMatchDay } from "./format";
import type { ArchivedFlight, MonitoringZone, VerificationOutcome } from "./types";

export type ArchivedFlightFilters = {
  tailQuery: string;
  organizationQuery: string;
  status: VerificationOutcome | "";
  region: MonitoringZone | "";
  stateAbbr: string;
  landingDateFrom: string;
  landingDateTo: string;
};

export const emptyArchivedFlightFilters = (): ArchivedFlightFilters => ({
  tailQuery: "",
  organizationQuery: "",
  status: "",
  region: "",
  stateAbbr: "",
  landingDateFrom: "",
  landingDateTo: "",
});

function parseFilterDate(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function startOfDayMs(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDayMs(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function filterArchivedFlights(
  flights: ArchivedFlight[],
  filters: ArchivedFlightFilters,
): ArchivedFlight[] {
  const tail = filters.tailQuery.trim().toLowerCase();
  const org = filters.organizationQuery.trim().toLowerCase();
  const fromMs = parseFilterDate(filters.landingDateFrom);
  const toMs = parseFilterDate(filters.landingDateTo);
  const toEnd = toMs !== null ? endOfDayMs(toMs) : null;
  const fromStart = fromMs !== null ? startOfDayMs(fromMs) : null;

  return flights.filter((flight) => {
    if (tail && !flight.tailNumber.toLowerCase().includes(tail)) {
      return false;
    }

    if (
      org &&
      !(flight.organizationName ?? "").toLowerCase().includes(org)
    ) {
      return false;
    }

    if (filters.status && flight.finalStatus !== filters.status) {
      return false;
    }

    if (filters.region && flight.monitoringZone !== filters.region) {
      return false;
    }

    if (filters.stateAbbr) {
      const state = (flight.homeState ?? "").toUpperCase();
      if (state !== filters.stateAbbr.toUpperCase()) return false;
    }

    if (fromStart !== null && flight.landingTime < fromStart) {
      return false;
    }

    if (toEnd !== null && flight.landingTime > toEnd) {
      return false;
    }

    if (
      filters.landingDateFrom &&
      !filters.landingDateTo &&
      fromMs !== null &&
      !datesMatchDay(flight.landingTime, fromMs)
    ) {
      return false;
    }

    return true;
  });
}

export function getArchiveLastUpdated(flights: ArchivedFlight[]): number | null {
  if (flights.length === 0) return null;
  return Math.max(...flights.map((f) => getArchivedAt(f)));
}
