"use client";

import { useSyncExternalStore } from "react";
import {
  getIncidentReportsServerSnapshot,
  getIncidentReportsSnapshot,
  subscribeIncidentReportsRegistry,
} from "@/stores/incident-reports-store";

export function useIncidentReportsRegistry(): ReturnType<
  typeof getIncidentReportsSnapshot
> {
  return useSyncExternalStore(
    subscribeIncidentReportsRegistry,
    getIncidentReportsSnapshot,
    getIncidentReportsServerSnapshot,
  );
}
