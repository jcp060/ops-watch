import type { MonitoringZone, OccUser } from "./types";
import { MONITORING_ZONES } from "./types";

export type OperatorMapProfile = {
  id: string;
  name: string;
  role: OccUser["role"];
  assignedZones: MonitoringZone[];
  color: string;
};

export const OPERATOR_MAP_COLORS = [
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#fb7185",
  "#38bdf8",
  "#4ade80",
  "#f472b6",
] as const;

export function resolveOperatorAssignedZones(
  user: OccUser,
  index: number,
): MonitoringZone[] {
  if (user.assignedMonitoringZones?.length) {
    return user.assignedMonitoringZones;
  }
  if (user.role === "Admin" || user.role === "Supervisor") {
    return [...MONITORING_ZONES];
  }
  return [MONITORING_ZONES[index % MONITORING_ZONES.length]];
}

export function buildOperatorProfiles(users: OccUser[]): OperatorMapProfile[] {
  const activeOperators = users.filter((user) => user.status === "Active");
  return activeOperators.map((user, index) => ({
    id: user.id,
    name: user.name,
    role: user.role,
    assignedZones: resolveOperatorAssignedZones(user, index),
    color: OPERATOR_MAP_COLORS[index % OPERATOR_MAP_COLORS.length],
  }));
}

export function getOperatorsForZone(
  operators: OperatorMapProfile[],
  zone: MonitoringZone,
): OperatorMapProfile[] {
  return operators.filter((operator) => operator.assignedZones.includes(zone));
}
