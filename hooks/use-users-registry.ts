"use client";

import { useSyncExternalStore } from "react";
import {
  getUsersServerSnapshot,
  getUsersSnapshot,
  subscribeUsersRegistry,
} from "@/stores/users-store";
import type { OccUser } from "@/lib/types";

/**
 * Global users registry (hydrated in OccProviders before this hook runs).
 */
export function useUsersRegistry(): OccUser[] {
  return useSyncExternalStore(
    subscribeUsersRegistry,
    getUsersSnapshot,
    getUsersServerSnapshot,
  );
}
