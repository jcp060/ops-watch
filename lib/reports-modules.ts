import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Archive, ClipboardList } from "lucide-react";

export type ReportModuleStatus = "active" | "coming_soon";

export type ReportModuleDefinition = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: ReportModuleStatus;
};

/** Active report modules — extend this list as new areas ship. */
export const ACTIVE_REPORT_MODULES: ReportModuleDefinition[] = [
  {
    id: "archived-flights",
    title: "Archived Flights",
    description:
      "Landed flight history, verification records, and 14-day retention controls.",
    href: "/reports/archived-flights",
    icon: Archive,
    status: "active",
  },
  {
    id: "incidents",
    title: "Accidents & Incidents",
    description:
      "Operational event documentation, severity tracking, and compliance records.",
    href: "/reports/incidents",
    icon: AlertTriangle,
    status: "active",
  },
];

/** Planned modules — shown on the landing page for future expansion. */
export const PLANNED_REPORT_MODULES: ReportModuleDefinition[] = [
  {
    id: "activity-logs",
    title: "Activity Logs",
    description: "OCC action timeline and session audit trail.",
    href: "#",
    icon: ClipboardList,
    status: "coming_soon",
  },
  {
    id: "operator-performance",
    title: "Operator Performance",
    description: "Verification cadence, response times, and workload metrics.",
    href: "#",
    icon: ClipboardList,
    status: "coming_soon",
  },
  {
    id: "flight-statistics",
    title: "Flight Statistics",
    description: "Fleet utilization, zone distribution, and trend summaries.",
    href: "#",
    icon: ClipboardList,
    status: "coming_soon",
  },
  {
    id: "compliance",
    title: "Compliance Reports",
    description: "Regulatory exports and scheduled compliance packages.",
    href: "#",
    icon: ClipboardList,
    status: "coming_soon",
  },
  {
    id: "audit-history",
    title: "Audit History",
    description: "Immutable change log across registry and configuration.",
    href: "#",
    icon: ClipboardList,
    status: "coming_soon",
  },
];

export function isReportsPath(pathname: string): boolean {
  return pathname === "/reports" || pathname.startsWith("/reports/");
}

export function reportsModuleFromPath(pathname: string): string | null {
  if (pathname === "/reports") return null;
  if (pathname.startsWith("/reports/archived-flights")) return "archived-flights";
  if (pathname.startsWith("/reports/incidents")) return "incidents";
  return null;
}
