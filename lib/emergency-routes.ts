import type { IncidentReport } from "./types";

export function emergencyResponsePath(incidentId: string): string {
  return `/reports/incidents/emergency/${encodeURIComponent(incidentId)}`;
}

export function findIncidentByRouteParam(
  reports: IncidentReport[],
  routeParam: string | null | undefined,
): IncidentReport | null {
  if (!routeParam?.trim()) return null;
  const decoded = decodeURIComponent(routeParam.trim());
  return (
    reports.find((report) => report.id === decoded) ??
    reports.find((report) => report.reportNumber === decoded) ??
    null
  );
}
