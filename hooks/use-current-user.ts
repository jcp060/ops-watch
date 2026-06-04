"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getCurrentUserIdSnapshot,
  resolveCurrentUser,
  subscribeSession,
} from "@/stores/session-store";
import type { OccUser } from "@/lib/types";

export function useCurrentUserId(): string | null {
  return useSyncExternalStore(
    subscribeSession,
    getCurrentUserIdSnapshot,
    () => null,
  );
}

export function useCurrentUser(users: OccUser[]): OccUser | null {
  const userId = useCurrentUserId();

  useEffect(() => {
    resolveCurrentUser(users);
  }, [users, userId]);

  const id = getCurrentUserIdSnapshot();
  if (!id) return resolveCurrentUser(users);
  return users.find((user) => user.id === id) ?? resolveCurrentUser(users);
}
