"use client";

import { useMemo } from "react";
import {
  buildCommandMapStats,
  type CommandMapStats,
} from "@/lib/command-map-stats";
import type {
  ActiveFlight,
  Aircraft,
  ArchivedFlight,
  IncidentReport,
  OccUser,
} from "@/lib/types";

export function useCommandMapStats(
  users: OccUser[],
  activeFlights: ActiveFlight[],
  archivedFlights: ArchivedFlight[],
  aircraftRegistry: Aircraft[],
  now: number,
  incidentReports: IncidentReport[] = [],
): CommandMapStats {
  return useMemo(
    () =>
      buildCommandMapStats(
        users,
        activeFlights,
        archivedFlights,
        aircraftRegistry,
        now,
        incidentReports,
      ),
    [users, activeFlights, archivedFlights, aircraftRegistry, now, incidentReports],
  );
}
