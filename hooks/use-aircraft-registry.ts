"use client";

import { useSyncExternalStore } from "react";
import {
  getAircraftRegistryServerSnapshot,
  getAircraftRegistrySnapshot,
  subscribeAircraftRegistry,
} from "@/stores/aircraft-store";
import type { Aircraft } from "@/lib/types";

/**
 * Global aircraft registry (hydrated in OccProviders before this hook runs).
 */
export function useAircraftRegistry(): Aircraft[] {
  return useSyncExternalStore(
    subscribeAircraftRegistry,
    getAircraftRegistrySnapshot,
    getAircraftRegistryServerSnapshot,
  );
}
