import { tailNumberNumericValue } from "./aircraft-sort";
import { digitsOnlyPhone } from "./emergency-contact";
import type { Aircraft } from "./types";

/** Organization name shown as secondary label in the start-flight picker. */
export function getAircraftCallsign(aircraft: Aircraft): string {
  return aircraft.organizationName?.trim() ?? "";
}

function fuzzySubsequenceMatch(haystack: string, needle: string): boolean {
  if (needle.length === 0) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

function scoreAircraftMatch(aircraft: Aircraft, query: string): number {
  const tail = aircraft.tailNumber.toLowerCase();
  const type = aircraft.aircraftType.toLowerCase();
  const callsign = getAircraftCallsign(aircraft).toLowerCase();
  const emergencyName = (aircraft.emergencyContactName ?? "").toLowerCase();
  const emergencyDigits = digitsOnlyPhone(aircraft.emergencyContactPhone ?? "");
  const queryDigits = digitsOnlyPhone(query);

  if (tail === query) return 1_000;
  if (tail.startsWith(query)) return 900;
  if (callsign === query) return 850;
  if (callsign.startsWith(query)) return 800;
  if (type === query) return 750;
  if (type.startsWith(query)) return 700;
  if (tail.includes(query)) return 600;
  if (callsign.includes(query)) return 500;
  if (type.includes(query)) return 400;
  if (fuzzySubsequenceMatch(tail, query)) return 300;
  if (fuzzySubsequenceMatch(callsign, query)) return 200;
  if (fuzzySubsequenceMatch(type, query)) return 100;
  if (emergencyName === query) return 450;
  if (emergencyName.startsWith(query)) return 350;
  if (emergencyName.includes(query)) return 250;
  if (queryDigits.length >= 3 && emergencyDigits.includes(queryDigits)) return 300;

  return 0;
}

function compareAircraftAvailability(a: Aircraft, b: Aircraft): number {
  const statusRank = (status: Aircraft["status"]) =>
    status === "Active" ? 0 : 1;
  const statusDiff = statusRank(a.status) - statusRank(b.status);
  if (statusDiff !== 0) return statusDiff;

  const tailDiff =
    tailNumberNumericValue(a.tailNumber) - tailNumberNumericValue(b.tailNumber);
  if (tailDiff !== 0) return tailDiff;

  return a.tailNumber.localeCompare(b.tailNumber);
}

/** Client-side filter + rank for Start Flight aircraft picker. */
export function filterStartFlightAircraft(
  aircraft: Aircraft[],
  rawQuery: string,
): Aircraft[] {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return [...aircraft].sort(compareAircraftAvailability);
  }

  return aircraft
    .map((item) => ({ item, score: scoreAircraftMatch(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return compareAircraftAvailability(a.item, b.item);
    })
    .map((entry) => entry.item);
}
