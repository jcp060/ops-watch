import type {
  IncidentEventType,
  IncidentReport,
  IncidentReportStatus,
  IncidentSeverity,
  MonitoringZone,
} from "./types";

export type IncidentReportFilters = {
  reportNumberQuery: string;
  tailQuery: string;
  organizationQuery: string;
  stateAbbr: string;
  region: MonitoringZone | "";
  severity: IncidentSeverity | "";
  status: IncidentReportStatus | "";
  eventType: IncidentEventType | "";
  dateFrom: string;
  dateTo: string;
};

export const emptyIncidentReportFilters = (): IncidentReportFilters => ({
  reportNumberQuery: "",
  tailQuery: "",
  organizationQuery: "",
  stateAbbr: "",
  region: "",
  severity: "",
  status: "",
  eventType: "",
  dateFrom: "",
  dateTo: "",
});

function parseFilterDate(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function startOfDayMs(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDayMs(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function filterIncidentReports(
  reports: IncidentReport[],
  filters: IncidentReportFilters,
): IncidentReport[] {
  const reportNum = filters.reportNumberQuery.trim().toLowerCase();
  const tail = filters.tailQuery.trim().toLowerCase();
  const org = filters.organizationQuery.trim().toLowerCase();
  const fromMs = parseFilterDate(filters.dateFrom);
  const toMs = parseFilterDate(filters.dateTo);
  const fromStart = fromMs !== null ? startOfDayMs(fromMs) : null;
  const toEnd = toMs !== null ? endOfDayMs(toMs) : null;

  return reports.filter((report) => {
    if (
      reportNum &&
      !report.reportNumber.toLowerCase().includes(reportNum)
    ) {
      return false;
    }
    if (tail && !report.tailNumber.toLowerCase().includes(tail)) {
      return false;
    }
    if (org && !report.organizationName.toLowerCase().includes(org)) {
      return false;
    }
    if (filters.stateAbbr && report.state !== filters.stateAbbr.toUpperCase()) {
      return false;
    }
    if (filters.region && report.region !== filters.region) {
      return false;
    }
    if (filters.severity && report.severity !== filters.severity) {
      return false;
    }
    if (filters.status && report.status !== filters.status) {
      return false;
    }
    if (filters.eventType && report.eventType !== filters.eventType) {
      return false;
    }
    if (fromStart !== null && report.eventAt < fromStart) {
      return false;
    }
    if (toEnd !== null && report.eventAt > toEnd) {
      return false;
    }
    return true;
  });
}

export function getIncidentReportsLastUpdated(
  reports: IncidentReport[],
): number | null {
  if (reports.length === 0) return null;
  return Math.max(...reports.map((r) => r.updatedAt));
}
