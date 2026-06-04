import {
  cloneAircraft,
  deleteAircraftById,
  updateAircraftInRegistry,
} from "@/lib/aircraft-registry";
import { syncAircraftToApi } from "@/lib/aircraft-api-client";
import type { AircraftSaveResult } from "@/lib/aircraft-save";
import { reconcileAircraftMonitoringZone } from "@/lib/monitoring-region-config";
import {
  AIRCRAFT_REGISTRY_STORAGE_KEY,
  loadAircraftRegistryFromStorage,
  saveAircraftRegistryToStorage,
} from "@/lib/aircraft-persistence";
import { createInitialAircraftRegistry } from "@/lib/mock-aircraft";
import { migrateAircraftHomeState } from "@/lib/monitoring-region-config";
import type { Aircraft } from "@/lib/types";

export type AircraftMutationSource = "user-save" | "user-delete";

let registry: Aircraft[] | null = null;
let storeInitialized = false;
let persistenceHydrated = false;
/** Stable snapshot for useSyncExternalStore — new reference only when registry changes. */
let registrySnapshot: Aircraft[] = [];
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function refreshRegistrySnapshot(): void {
  const current = registry ?? [];
  registrySnapshot = current.map(cloneAircraft);
}

function defaultRegistry(): Aircraft[] {
  return createInitialAircraftRegistry();
}

function applyRegistry(next: Aircraft[]): void {
  registry = next;
  storeInitialized = true;
  refreshRegistrySnapshot();
}

function syncRegistryFromStorage(): void {
  const persisted = loadAircraftRegistryFromStorage();
  if (persisted !== null) {
    const migrated = persisted.map(migrateAircraftHomeState);
    applyRegistry(migrated);
    const changed = migrated.some(
      (aircraft, index) =>
        aircraft.homeState !== persisted[index]?.homeState ||
        aircraft.monitoringZone !== persisted[index]?.monitoringZone,
    );
    if (changed && persistenceHydrated) {
      saveAircraftRegistryToStorage(migrated);
    }
    return;
  }
  if (!storeInitialized || registry === null) {
    applyRegistry(defaultRegistry());
  }
}

/**
 * In-memory global registry. On the server this stays empty until client hydration.
 */
function ensureRegistry(): Aircraft[] {
  if (!storeInitialized || registry === null) {
    applyRegistry(defaultRegistry());
  }
  return registry!;
}

/**
 * Loads persisted registry from localStorage. Call once before rendering OCC UI.
 */
export function hydrateAircraftStoreFromPersistence(): void {
  if (typeof window === "undefined" || persistenceHydrated) return;
  persistenceHydrated = true;
  syncRegistryFromStorage();
  emitChange();
}

let crossTabSyncAttached = false;

function attachCrossTabSync(): void {
  if (typeof window === "undefined" || crossTabSyncAttached) return;
  crossTabSyncAttached = true;

  window.addEventListener("storage", (event) => {
    if (event.key !== AIRCRAFT_REGISTRY_STORAGE_KEY) return;
    if (event.storageArea !== window.localStorage) return;
    syncRegistryFromStorage();
    emitChange();
  });
}

attachCrossTabSync();

export function subscribeAircraftRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAircraftRegistrySnapshot(): Aircraft[] {
  ensureRegistry();
  return registrySnapshot;
}

export function getAircraftRegistryServerSnapshot(): Aircraft[] {
  return [];
}

export function isAircraftStoreHydrated(): boolean {
  return persistenceHydrated;
}

function commitRegistry(
  next: Aircraft[],
  source: AircraftMutationSource,
): void {
  assertExplicitAircraftMutation(source);
  const current = ensureRegistry();

  if (next === current) {
    return;
  }

  applyRegistry(next);
  if (persistenceHydrated) {
    try {
      saveAircraftRegistryToStorage(ensureRegistry());
    } catch {
      throw new Error("Failed to persist aircraft registry.");
    }
  }
  emitChange();
}

export function saveAircraftInStore(
  aircraft: Aircraft,
  mode: "create" | "edit",
): AircraftSaveResult {
  if (!persistenceHydrated) {
    return {
      ok: false,
      message: "Operations data is still loading. Try again in a moment.",
    };
  }

  const current = ensureRegistry();
  const existingIds = new Set(current.map((entry) => entry.id));

  if (mode === "create" && existingIds.has(aircraft.id)) {
    return {
      ok: false,
      message: "An aircraft with this id already exists. Close and reopen the form.",
    };
  }

  const reconciled = reconcileAircraftMonitoringZone(aircraft);
  const next = updateAircraftInRegistry(current, reconciled, mode);

  if (next === current) {
    return {
      ok: false,
      message:
        mode === "create"
          ? "Could not add aircraft — it may already exist."
          : "Could not update aircraft — record not found.",
    };
  }

  try {
    commitRegistry(next, "user-save");
    void syncAircraftToApi(reconciled, mode);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to save aircraft registry.",
    };
  }

  return { ok: true, aircraft };
}

export function deleteAircraftInStore(id: string): boolean {
  if (!persistenceHydrated) return false;
  const current = ensureRegistry();
  const next = deleteAircraftById(current, id);
  if (next.length === current.length) return false;
  commitRegistry(next, "user-delete");
  return true;
}

export function findAircraftById(aircraftId: string): Aircraft | undefined {
  return ensureRegistry().find((a) => a.id === aircraftId);
}

export function assertExplicitAircraftMutation(
  source: AircraftMutationSource,
): void {
  if (process.env.NODE_ENV === "production") return;
  const allowed: AircraftMutationSource[] = ["user-save", "user-delete"];
  if (!allowed.includes(source)) {
    console.warn(
      `[aircraft-store] Unexpected mutation source: ${source}. Registry updates must use saveAircraftInStore or deleteAircraftInStore.`,
    );
  }
}
