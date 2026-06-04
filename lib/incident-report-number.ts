import type { IncidentReport } from "./types";

/** Format: IR-YYYY-#### (zero-padded sequence per year). */
export function generateIncidentReportNumber(
  existing: IncidentReport[],
  eventAt: number,
): string {
  const year = new Date(eventAt).getFullYear();
  const prefix = `IR-${year}-`;
  const sameYear = existing.filter((r) => r.reportNumber.startsWith(prefix));
  let maxSeq = 0;
  for (const report of sameYear) {
    const suffix = report.reportNumber.slice(prefix.length);
    const seq = Number.parseInt(suffix, 10);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }
  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
