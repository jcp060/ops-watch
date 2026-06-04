import {
  ArchiveRetentionError,
  assertArchivedFlightDeletable,
  getArchivedAt,
} from "@/lib/archive-retention";
import {
  createArchivedFlightSnapshot,
  prependUniqueArchivedFlight,
} from "@/lib/archived-flights";
import {
  ARCHIVE_STORAGE_KEY,
  loadArchiveFromStorage,
  parsePersistedArchive,
  saveArchiveToStorage,
} from "@/lib/archive-persistence";
import { createInitialArchivedFlights } from "@/lib/mock-aircraft";
import type {
  ActiveFlightSession,
  Aircraft,
  ArchivedFlight,
  VerificationRecord,
} from "@/lib/types";

let archives: ArchivedFlight[] | null = null;
let storeInitialized = false;
let persistenceHydrated = false;
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function defaultArchives(): ArchivedFlight[] {
  return createInitialArchivedFlights();
}

function applyArchives(next: ArchivedFlight[]): void {
  archives = next;
  storeInitialized = true;
}

function syncArchivesFromStorage(): void {
  const persisted = loadArchiveFromStorage();
  if (persisted !== null) {
    applyArchives(persisted);
    return;
  }
  if (!storeInitialized || archives === null) {
    applyArchives(defaultArchives());
  }
}

function ensureArchives(): ArchivedFlight[] {
  if (!storeInitialized || archives === null) {
    applyArchives(defaultArchives());
  }
  return archives;
}

export function hydrateArchiveStoreFromPersistence(): void {
  if (typeof window === "undefined" || persistenceHydrated) return;
  persistenceHydrated = true;
  syncArchivesFromStorage();
  emitChange();
}

let crossTabSyncAttached = false;

function attachCrossTabSync(): void {
  if (typeof window === "undefined" || crossTabSyncAttached) return;
  crossTabSyncAttached = true;

  window.addEventListener("storage", (event) => {
    if (event.key !== ARCHIVE_STORAGE_KEY) return;
    if (event.storageArea !== window.localStorage) return;
    syncArchivesFromStorage();
    emitChange();
  });
}

attachCrossTabSync();

export function subscribeArchive(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getArchiveSnapshot(): ArchivedFlight[] {
  return ensureArchives();
}

export function getArchiveServerSnapshot(): ArchivedFlight[] {
  return defaultArchives();
}

export function commitArchive(next: ArchivedFlight[]): ArchivedFlight[] {
  const current = ensureArchives();
  if (next === current) {
    return current;
  }
  archives = next;
  storeInitialized = true;
  if (persistenceHydrated) {
    saveArchiveToStorage(archives);
  }
  emitChange();
  return archives;
}

export function archiveLandedFlight(
  current: ArchivedFlight[],
  session: ActiveFlightSession,
  aircraft: Aircraft,
  landingTime: number,
  verificationHistory: VerificationRecord[],
): ArchivedFlight[] {
  const archivedAt = Date.now();
  const archived = createArchivedFlightSnapshot(
    session,
    aircraft,
    landingTime,
    "Landed Safely",
    verificationHistory,
    archivedAt,
  );
  const next = prependUniqueArchivedFlight(current, archived);
  return commitArchive(next);
}

export type ArchiveDeleteResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_found" | "retention_locked";
      unlockAt?: number;
      message?: string;
    };

export function findArchivedFlightById(id: string): ArchivedFlight | undefined {
  return ensureArchives().find((flight) => flight.id === id);
}

/**
 * Permanently removes an archived flight after the 14-day retention period.
 * Enforced here (store layer) — UI cannot bypass without mutating storage directly.
 */
export function deleteArchivedFlightInStore(
  id: string,
  now = Date.now(),
): ArchiveDeleteResult {
  const current = ensureArchives();
  const flight = current.find((entry) => entry.id === id);
  if (!flight) {
    return { ok: false, reason: "not_found" };
  }

  const archivedAt = getArchivedAt(flight);
  try {
    assertArchivedFlightDeletable(archivedAt, now);
  } catch (error) {
    if (error instanceof ArchiveRetentionError) {
      return {
        ok: false,
        reason: "retention_locked",
        unlockAt: error.unlockAt,
        message: error.message,
      };
    }
    throw error;
  }

  const next = current.filter((entry) => entry.id !== id);
  if (next.length === current.length) {
    return { ok: false, reason: "not_found" };
  }

  commitArchive(next);
  return { ok: true };
}
