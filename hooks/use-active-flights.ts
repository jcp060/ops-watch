"use client";

import { useSyncExternalStore } from "react";
import {
  getActiveFlightsServerSnapshot,
  getActiveFlightsSnapshot,
  subscribeActiveFlights,
} from "@/stores/active-flights-store";
import type { ActiveFlightSession } from "@/lib/types";

/** Live active flight sessions — updates when flights start, verify, or land. */
export function useActiveFlights(): ActiveFlightSession[] {
  return useSyncExternalStore(
    subscribeActiveFlights,
    getActiveFlightsSnapshot,
    getActiveFlightsServerSnapshot,
  );
}
