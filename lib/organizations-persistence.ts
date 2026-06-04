import { normalizeEmergencyPhone } from "./emergency-contact";
import { hasUniqueOrganizationIds } from "./organizations-registry";
import type { Organization } from "./types";

export const ORGANIZATIONS_REGISTRY_STORAGE_KEY =
  "sentinel-occ:organizations-registry";

function isValidOrganizationRow(value: unknown): value is Organization {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.organizationName === "string" &&
    typeof row.primaryContactName === "string" &&
    typeof row.primaryContactPhone === "string" &&
    typeof row.emergencyContactName === "string" &&
    typeof row.emergencyContactPhone === "string" &&
    typeof row.email === "string" &&
    typeof row.address === "string" &&
    typeof row.notes === "string" &&
    typeof row.createdAt === "number" &&
    Number.isFinite(row.createdAt)
  );
}

function normalizeOrganization(value: unknown): Organization | null {
  if (!isValidOrganizationRow(value)) return null;
  const row = value as Organization;
  return {
    id: row.id,
    organizationName: row.organizationName.trim(),
    primaryContactName: row.primaryContactName.trim(),
    primaryContactPhone: normalizeEmergencyPhone(row.primaryContactPhone),
    emergencyContactName: row.emergencyContactName.trim(),
    emergencyContactPhone: normalizeEmergencyPhone(row.emergencyContactPhone),
    email: row.email.trim(),
    address: row.address.trim(),
    notes: row.notes.trim(),
    createdAt: row.createdAt,
  };
}

export function parsePersistedOrganizationsRegistry(
  raw: string,
): Organization[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const registry = parsed
      .map(normalizeOrganization)
      .filter((row): row is Organization => row !== null);
    if (registry.length === 0 && parsed.length > 0) return null;
    if (!hasUniqueOrganizationIds(registry)) return null;
    return registry;
  } catch {
    return null;
  }
}

export function loadOrganizationsRegistryFromStorage(): Organization[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ORGANIZATIONS_REGISTRY_STORAGE_KEY);
  if (!raw) return null;
  return parsePersistedOrganizationsRegistry(raw);
}

export function saveOrganizationsRegistryToStorage(
  registry: Organization[],
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ORGANIZATIONS_REGISTRY_STORAGE_KEY,
    JSON.stringify(registry),
  );
}
