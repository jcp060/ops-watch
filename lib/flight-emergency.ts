import type { ActiveFlightSession } from "./types";

export function linkEmergencyIncidentToSession(
  session: ActiveFlightSession,
  verifiedAt: number,
  incidentReportId: string,
): ActiveFlightSession {
  return {
    ...session,
    emergencyDeclaredAt: session.emergencyDeclaredAt ?? verifiedAt,
    incidentReportId,
  };
}
