"use client";

import { useSyncExternalStore } from "react";
import {
  getArchiveServerSnapshot,
  getArchiveSnapshot,
  subscribeArchive,
} from "@/stores/archive-store";
import type { ArchivedFlight } from "@/lib/types";

export function useArchive(): ArchivedFlight[] {
  return useSyncExternalStore(
    subscribeArchive,
    getArchiveSnapshot,
    getArchiveServerSnapshot,
  );
}
