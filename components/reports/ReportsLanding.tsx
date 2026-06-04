"use client";

import {
  useArchiveStore,
  useIncidentReportsStore,
} from "@/context/OccContext";
import { ReportModuleCard } from "@/components/reports/ReportModuleCard";
import { ReportsSubNav } from "@/components/reports/ReportsSubNav";
import { getArchiveLastUpdated } from "@/lib/archive-search";
import { getIncidentReportsLastUpdated } from "@/lib/incident-report-search";
import {
  ACTIVE_REPORT_MODULES,
  PLANNED_REPORT_MODULES,
} from "@/lib/reports-modules";

export function ReportsLanding() {
  const { archivedFlights } = useArchiveStore();
  const { incidentReports } = useIncidentReportsStore();

  const statsByModule: Record<
    string,
    { count: number; lastUpdated: number | null }
  > = {
    "archived-flights": {
      count: archivedFlights.length,
      lastUpdated: getArchiveLastUpdated(archivedFlights),
    },
    incidents: {
      count: incidentReports.length,
      lastUpdated: getIncidentReportsLastUpdated(incidentReports),
    },
  };

  return (
    <div className="space-y-6">
      <ReportsSubNav />

      <div>
        <h2 className="text-xl font-semibold text-slate-100">Reports Center</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Historical records, incident documentation, and compliance reporting for
          Sentinel OCC operations.
        </p>
      </div>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Active modules
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {ACTIVE_REPORT_MODULES.map((module) => {
            const stats = statsByModule[module.id] ?? {
              count: 0,
              lastUpdated: null,
            };
            return (
              <ReportModuleCard
                key={module.id}
                module={module}
                recordCount={stats.count}
                lastUpdated={stats.lastUpdated}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Planned modules
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNED_REPORT_MODULES.map((module) => (
            <ReportModuleCard
              key={module.id}
              module={module}
              recordCount={0}
              lastUpdated={null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
