import type { Aircraft } from "./types";

/** Numeric portion of tail number for ordering (e.g. N12345 → 12345). */
export function tailNumberNumericValue(tailNumber: string): number {
  const digits = tailNumber.replace(/\D/g, "");
  return digits.length > 0 ? Number.parseInt(digits, 10) : 0;
}

export function sortAircraftByTailNumber(aircraft: Aircraft[]): Aircraft[] {
  return [...aircraft].sort((a, b) => {
    const diff =
      tailNumberNumericValue(a.tailNumber) - tailNumberNumericValue(b.tailNumber);
    if (diff !== 0) return diff;
    return a.tailNumber.localeCompare(b.tailNumber);
  });
}
