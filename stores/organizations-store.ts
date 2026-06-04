import { createInitialOrganizations } from "@/lib/mock-organizations";
import { prepareOrganizationSave } from "@/lib/organization-save";
import {
  cloneOrganization,
  deleteOrganizationById,
  updateOrganizationInRegistry,
} from "@/lib/organizations-registry";
import {
  loadOrganizationsRegistryFromStorage,
  ORGANIZATIONS_REGISTRY_STORAGE_KEY,
  saveOrganizationsRegistryToStorage,
} from "@/lib/organizations-persistence";
import type { OrganizationSaveResult } from "@/lib/organization-save";
import type { Organization } from "@/lib/types";

export type OrganizationMutationSource = "user-save" | "user-delete";

let registry: Organization[] | null = null;
let storeInitialized = false;
let persistenceHydrated = false;
let registrySnapshot: Organization[] = [];
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function refreshSnapshot(): void {
  registrySnapshot = (registry ?? []).map(cloneOrganization);
}

function defaultRegistry(): Organization[] {
  return createInitialOrganizations();
}

function applyRegistry(next: Organization[]): void {
  registry = next;
  storeInitialized = true;
  refreshSnapshot();
}

function syncRegistryFromStorage(): void {
  const persisted = loadOrganizationsRegistryFromStorage();
  if (persisted !== null) {
    applyRegistry(persisted);
    return;
  }
  if (!storeInitialized || registry === null) {
    applyRegistry(defaultRegistry());
  }
}

function ensureRegistry(): Organization[] {
  if (!storeInitialized || registry === null) {
    applyRegistry(defaultRegistry());
  }
  return registry!;
}

export function hydrateOrganizationsStoreFromPersistence(): void {
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
    if (event.key !== ORGANIZATIONS_REGISTRY_STORAGE_KEY) return;
    if (event.storageArea !== window.localStorage) return;
    syncRegistryFromStorage();
    emitChange();
  });
}

attachCrossTabSync();

export function subscribeOrganizationsRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOrganizationsSnapshot(): Organization[] {
  ensureRegistry();
  return registrySnapshot;
}

export function getOrganizationsServerSnapshot(): Organization[] {
  return [];
}

export function isOrganizationsStoreHydrated(): boolean {
  return persistenceHydrated;
}

function commitRegistry(
  next: Organization[],
  source: OrganizationMutationSource,
): void {
  if (process.env.NODE_ENV !== "production") {
    const allowed: OrganizationMutationSource[] = ["user-save", "user-delete"];
    if (!allowed.includes(source)) {
      console.warn(`[organizations-store] Unexpected mutation source: ${source}`);
    }
  }

  const current = ensureRegistry();
  if (next === current) return;

  applyRegistry(next);
  if (persistenceHydrated) {
    saveOrganizationsRegistryToStorage(ensureRegistry());
  }
  emitChange();
}

export function saveOrganizationInStore(
  organization: Organization,
  mode: "create" | "edit",
): OrganizationSaveResult {
  if (!persistenceHydrated) {
    return {
      ok: false,
      message: "Operations data is still loading. Try again in a moment.",
    };
  }

  const current = ensureRegistry();
  const prepared = prepareOrganizationSave(organization, mode, current);
  if (!prepared.ok) return prepared;

  if (mode === "create" && current.some((entry) => entry.id === prepared.organization.id)) {
    return { ok: false, message: "Organization id already exists." };
  }

  const next = updateOrganizationInRegistry(current, prepared.organization, mode);
  if (next === current) {
    return {
      ok: false,
      message:
        mode === "create"
          ? "Could not add organization."
          : "Could not update organization.",
    };
  }

  commitRegistry(next, "user-save");
  return { ok: true, organization: prepared.organization };
}

export function deleteOrganizationInStore(id: string): boolean {
  if (!persistenceHydrated) return false;
  const current = ensureRegistry();
  const next = deleteOrganizationById(current, id);
  if (next.length === current.length) return false;
  commitRegistry(next, "user-delete");
  return true;
}

export function findOrganizationByIdInStore(
  id: string,
): Organization | undefined {
  return ensureRegistry().find((entry) => entry.id === id);
}
