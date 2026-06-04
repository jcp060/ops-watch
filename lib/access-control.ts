import type { UserRole } from "./types";

export const COMMAND_MAP_ALLOWED_ROLES: UserRole[] = ["Admin", "Supervisor"];

export const COMMAND_MAP_ROLE_COOKIE = "occ-session-role";

export function canAccessCommandMap(role: UserRole): boolean {
  return role === "Admin" || role === "Supervisor";
}

export function isCommandMapRoleCookieValid(role: string | undefined): boolean {
  if (!role) return false;
  return COMMAND_MAP_ALLOWED_ROLES.includes(role as UserRole);
}

export function canManageOrganizations(role: UserRole): boolean {
  return role === "Admin" || role === "Supervisor";
}

export function canEditAircraftEmergencyContact(role: UserRole): boolean {
  return canManageOrganizations(role);
}

/** All OCC roles may view emergency contacts when aircraft details are shown. */
export function canViewAircraftEmergencyContact(_role: UserRole): boolean {
  return true;
}

/** Historical reports hub — all authenticated OCC roles. */
export function canAccessReports(_role: UserRole): boolean {
  return true;
}

export function canManageIncidentReports(role: UserRole): boolean {
  return role === "Admin" || role === "Supervisor";
}

export function canDeleteIncidentReports(role: UserRole): boolean {
  return role === "Admin";
}

export function canViewIncidentReports(_role: UserRole): boolean {
  return true;
}

/** Operators may complete their own emergency check-in report; supervisors edit any report. */
export function canEditEmergencyIncidentReport(
  role: UserRole,
  report: { createdByUserId: string; isEmergencyTrigger: boolean },
  userId: string,
): boolean {
  if (canManageIncidentReports(role)) return true;
  return report.isEmergencyTrigger && report.createdByUserId === userId;
}

export function canManageAllResponsePlans(role: UserRole): boolean {
  return role === "Admin";
}

export function canManageOrganizationResponsePlan(
  role: UserRole,
  organizationId: string,
  user: { assignedOrganizationIds?: string[] },
): boolean {
  if (role === "Admin") return true;
  if (role !== "Supervisor") return false;
  const assigned = user.assignedOrganizationIds;
  if (!assigned || assigned.length === 0) return true;
  return assigned.includes(organizationId);
}
