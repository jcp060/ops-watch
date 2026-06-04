import {
  validateIncidentReportForSave,
  type IncidentReportSaveResult,
} from "@/lib/incident-report-save";
import {
  cloneIncidentReport,
  deleteIncidentReportById,
  updateIncidentReportInRegistry,
} from "@/lib/incident-reports-registry";
import {
  loadIncidentReportsFromStorage,
  INCIDENT_REPORTS_STORAGE_KEY,
  saveIncidentReportsToStorage,
} from "@/lib/incident-reports-persistence";
import { createInitialIncidentReports } from "@/lib/mock-incident-reports";
import type { IncidentReport } from "@/lib/types";

export type IncidentReportMutationSource = "user-save" | "user-delete";

let registry: IncidentReport[] | null = null;
let storeInitialized = false;
let persistenceHydrated = false;
let registrySnapshot: IncidentReport[] = [];
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function refreshSnapshot(): void {
  registrySnapshot = (registry ?? []).map(cloneIncidentReport);
}

function defaultRegistry(): IncidentReport[] {
  return createInitialIncidentReports();
}

function applyRegistry(next: IncidentReport[]): void {
  registry = next;
  storeInitialized = true;
  refreshSnapshot();
}

function syncRegistryFromStorage(): void {
  const persisted = loadIncidentReportsFromStorage();
  if (persisted !== null) {
    applyRegistry(persisted);
    return;
  }
  if (!storeInitialized || registry === null) {
    applyRegistry(defaultRegistry());
  }
}

function ensureRegistry(): IncidentReport[] {
  if (!storeInitialized || registry === null) {
    applyRegistry(defaultRegistry());
  }
  return registry!;
}

export function hydrateIncidentReportsStoreFromPersistence(): void {
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
    if (event.key !== INCIDENT_REPORTS_STORAGE_KEY) return;
    if (event.storageArea !== window.localStorage) return;
    syncRegistryFromStorage();
    emitChange();
  });
}

attachCrossTabSync();

export function subscribeIncidentReportsRegistry(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getIncidentReportsSnapshot(): IncidentReport[] {
  ensureRegistry();
  return registrySnapshot;
}

export function getIncidentReportsServerSnapshot(): IncidentReport[] {
  return [];
}

export function isIncidentReportsStoreHydrated(): boolean {
  return persistenceHydrated;
}

function commitRegistry(
  next: IncidentReport[],
  source: IncidentReportMutationSource,
): void {
  if (process.env.NODE_ENV !== "production") {
    const allowed: IncidentReportMutationSource[] = ["user-save", "user-delete"];
    if (!allowed.includes(source)) {
      console.warn(`[incident-reports-store] Unexpected mutation source: ${source}`);
    }
  }

  const current = ensureRegistry();
  if (next === current) return;

  applyRegistry(next);
  if (persistenceHydrated) {
    saveIncidentReportsToStorage(ensureRegistry());
  }
  emitChange();
}

export function flushIncidentReportsToStorage(): void {
  persistIncidentReportsNow();
}

export function persistIncidentReportsNow(): void {
  if (typeof window === "undefined") return;
  saveIncidentReportsToStorage(ensureRegistry());
}

export function saveIncidentReportInStore(
  report: IncidentReport,
  mode: "create" | "edit",
): IncidentReportSaveResult {
  const current = ensureRegistry();
  const prepared = validateIncidentReportForSave(report, current, mode);
  if (!prepared.ok) return prepared;

  const next = updateIncidentReportInRegistry(
    current,
    prepared.report,
    mode,
  );
  commitRegistry(next, "user-save");
  return { ok: true, report: prepared.report };
}

export function deleteIncidentReportInStore(id: string): boolean {
  const current = ensureRegistry();
  if (!current.some((r) => r.id === id)) return false;
  commitRegistry(deleteIncidentReportById(current, id), "user-delete");
  return true;
}
