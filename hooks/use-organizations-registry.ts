"use client";

import { useSyncExternalStore } from "react";
import {
  getOrganizationsServerSnapshot,
  getOrganizationsSnapshot,
  subscribeOrganizationsRegistry,
} from "@/stores/organizations-store";

export function useOrganizationsRegistry(): ReturnType<
  typeof getOrganizationsSnapshot
> {
  return useSyncExternalStore(
    subscribeOrganizationsRegistry,
    getOrganizationsSnapshot,
    getOrganizationsServerSnapshot,
  );
}
