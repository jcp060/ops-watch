"use client";

import { AlertTriangle } from "lucide-react";
import { useIncidentReportsStore } from "@/context/OccContext";
import { countActiveEmergencyIncidents } from "@/lib/emergency-workflow";

export function EmergencyBanner() {
  const { incidentReports } = useIncidentReportsStore();
  const count = countActiveEmergencyIncidents(incidentReports);

  if (count === 0) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" aria-hidden />
      <div>
        <p className="font-semibold text-red-200">
          Active emergency{count === 1 ? "" : "ies"} · {count} open report
          {count === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 text-red-100/80">
          Aircraft remain on active monitoring. Complete incident documentation
          under Reports → Accidents &amp; Incidents.
        </p>
      </div>
    </div>
  );
}
