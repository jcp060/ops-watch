import { hasUniqueUserIds } from "./users-registry";
import type { EntityStatus, OccUser, UserRole } from "./types";

export const USERS_REGISTRY_STORAGE_KEY = "sentinel-occ:users-registry";

const USER_ROLES: UserRole[] = ["OCC Operator", "Supervisor", "Admin"];
const ENTITY_STATUSES: EntityStatus[] = ["Active", "Inactive"];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

function isEntityStatus(value: unknown): value is EntityStatus {
  return (
    typeof value === "string" &&
    ENTITY_STATUSES.includes(value as EntityStatus)
  );
}

function isValidUser(value: unknown): value is OccUser {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const lastLoginAt = row.lastLoginAt;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.name === "string" &&
    typeof row.email === "string" &&
    isUserRole(row.role) &&
    isEntityStatus(row.status) &&
    (lastLoginAt === null ||
      (typeof lastLoginAt === "number" && Number.isFinite(lastLoginAt)))
  );
}

function normalizeUser(value: unknown): OccUser | null {
  if (!value || typeof value !== "object") return null;
  const row = { ...(value as Record<string, unknown>) };
  if (row.lastLoginAt === undefined) {
    row.lastLoginAt = null;
  }
  return isValidUser(row) ? (row as OccUser) : null;
}

export function parsePersistedUsersRegistry(raw: string): OccUser[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const registry = parsed
      .map(normalizeUser)
      .filter((row): row is OccUser => row !== null);
    if (registry.length === 0 && parsed.length > 0) return null;
    if (!hasUniqueUserIds(registry)) return null;
    return registry;
  } catch {
    return null;
  }
}

export function loadUsersRegistryFromStorage(): OccUser[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USERS_REGISTRY_STORAGE_KEY);
  if (!raw) return null;
  return parsePersistedUsersRegistry(raw);
}

export function saveUsersRegistryToStorage(registry: OccUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    USERS_REGISTRY_STORAGE_KEY,
    JSON.stringify(registry),
  );
}
