import { createInitialUsers } from "@/lib/mock-users";
import {
  USERS_REGISTRY_STORAGE_KEY,
  loadUsersRegistryFromStorage,
  saveUsersRegistryToStorage,
} from "@/lib/users-persistence";
import { deleteUserById, updateUserInRegistry } from "@/lib/users-registry";
import type { OccUser } from "@/lib/types";

export type UserMutationSource = "user-save" | "user-delete";

let registry: OccUser[] | null = null;
let storeInitialized = false;
let persistenceHydrated = false;
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function defaultRegistry(): OccUser[] {
  return createInitialUsers();
}

function applyRegistry(next: OccUser[]): OccUser[] {
  registry = next;
  storeInitialized = true;
  return next;
}

function syncRegistryFromStorage(): void {
  const persisted = loadUsersRegistryFromStorage();
  if (persisted !== null) {
    applyRegistry(persisted);
    return;
  }
  if (!storeInitialized || registry === null) {
    applyRegistry(defaultRegistry());
  }
}

function ensureRegistry(): OccUser[] {
  if (!storeInitialized || registry === null) {
    return applyRegistry(defaultRegistry());
  }
  return registry;
}

export function hydrateUsersStoreFromPersistence(): void {
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
    if (event.key !== USERS_REGISTRY_STORAGE_KEY) return;
    if (event.storageArea !== window.localStorage) return;
    syncRegistryFromStorage();
    emitChange();
  });
}

attachCrossTabSync();

export function subscribeUsersRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getUsersSnapshot(): OccUser[] {
  return ensureRegistry();
}

export function getUsersServerSnapshot(): OccUser[] {
  return defaultRegistry();
}

export function isUsersStoreHydrated(): boolean {
  return persistenceHydrated;
}

function commitRegistry(next: OccUser[], source: UserMutationSource): OccUser[] {
  assertExplicitUserMutation(source);
  const current = ensureRegistry();

  if (next === current) {
    return current;
  }

  if (next === registry) {
    emitChange();
    return next;
  }

  applyRegistry(next);
  if (persistenceHydrated) {
    saveUsersRegistryToStorage(next);
  }
  emitChange();
  return next;
}

export function saveUserInStore(user: OccUser, mode: "create" | "edit"): void {
  if (!persistenceHydrated) return;
  const current = ensureRegistry();
  const next = updateUserInRegistry(current, user, mode);
  commitRegistry(next, "user-save");
}

export function deleteUserInStore(id: string): void {
  if (!persistenceHydrated) return;
  const current = ensureRegistry();
  const next = deleteUserById(current, id);
  if (next.length === current.length) return;
  commitRegistry(next, "user-delete");
}

export function findUserById(userId: string): OccUser | undefined {
  return ensureRegistry().find((u) => u.id === userId);
}

export function assertExplicitUserMutation(source: UserMutationSource): void {
  if (process.env.NODE_ENV === "production") return;
  const allowed: UserMutationSource[] = ["user-save", "user-delete"];
  if (!allowed.includes(source)) {
    console.warn(
      `[users-store] Unexpected mutation source: ${source}. Registry updates must use saveUserInStore or deleteUserInStore.`,
    );
  }
}
