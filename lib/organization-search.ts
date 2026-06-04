import { digitsOnlyPhone } from "./emergency-contact";
import type { Organization } from "./types";

function scoreMatch(haystack: string, query: string): number {
  const lower = haystack.toLowerCase();
  if (lower === query) return 1_000;
  if (lower.startsWith(query)) return 800;
  if (lower.includes(query)) return 500;
  return 0;
}

export function filterOrganizations(
  organizations: Organization[],
  rawQuery: string,
): Organization[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return [...organizations].sort((a, b) =>
      a.organizationName.localeCompare(b.organizationName),
    );
  }

  const phoneQuery = digitsOnlyPhone(rawQuery);

  return organizations
    .map((entry) => {
      let score = Math.max(
        scoreMatch(entry.organizationName, query),
        scoreMatch(entry.primaryContactName, query),
        scoreMatch(entry.emergencyContactName, query),
        scoreMatch(entry.email, query),
        scoreMatch(entry.address, query),
      );

      const phones = [
        entry.primaryContactPhone,
        entry.emergencyContactPhone,
      ];
      for (const phone of phones) {
        const digits = digitsOnlyPhone(phone);
        if (phoneQuery.length >= 3 && digits.includes(phoneQuery)) {
          score = Math.max(score, 600);
        }
      }

      return { entry, score };
    })
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.entry.organizationName.localeCompare(b.entry.organizationName),
    )
    .map((row) => row.entry);
}
