import { digitsOnlyPhone } from "./emergency-contact";
import type { Aircraft } from "./types";

function scoreMatch(haystack: string, query: string): number {
  const lower = haystack.toLowerCase();
  if (lower === query) return 1_000;
  if (lower.startsWith(query)) return 800;
  if (lower.includes(query)) return 500;
  return 0;
}

export function filterAircraftRegistry(
  aircraft: Aircraft[],
  rawQuery: string,
): Aircraft[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return aircraft;

  const phoneQuery = digitsOnlyPhone(rawQuery);

  return aircraft
    .map((entry) => {
      let score = Math.max(
        scoreMatch(entry.tailNumber, query),
        scoreMatch(entry.aircraftType, query),
        scoreMatch(entry.homeState, query),
        scoreMatch(entry.monitoringZone, query),
        scoreMatch(entry.organizationName ?? "", query),
        scoreMatch(entry.primaryContactName ?? "", query),
        scoreMatch(entry.emergencyContactName ?? "", query),
        scoreMatch(entry.email ?? "", query),
      );

      const phoneDigits = [
        entry.primaryContactPhone,
        entry.emergencyContactPhone,
      ]
        .map((phone) => digitsOnlyPhone(phone ?? ""))
        .join("");
      if (phoneQuery.length >= 3 && phoneDigits.includes(phoneQuery)) {
        score = Math.max(score, 600);
      }

      return { entry, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.tailNumber.localeCompare(b.entry.tailNumber))
    .map((row) => row.entry);
}
