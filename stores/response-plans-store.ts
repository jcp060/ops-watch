import {
  cloneOrganizationResponsePlan,
  deleteResponsePlansForOrganization,
  findResponsePlanByOrganizationId,
  upsertOrganizationResponsePlan,
} from "@/lib/response-plans-registry";
import {
  loadResponsePlansFromStorage,
  RESPONSE_PLANS_STORAGE_KEY,
  saveResponsePlansToStorage,
} from "@/lib/response-plans-persistence";
import { buildPlanVersionFromTemplate } from "@/lib/response-plan-templates";
import { getCurrentPlanVersion } from "@/lib/response-plan-execution";
import type {
  OrganizationResponsePlan,
  OrganizationResponsePlanVersion,
  ResponsePlanTemplateId,
} from "@/lib/types";
import { createUniqueId } from "@/lib/unique-id";

export type ResponsePlanSaveResult =
  | { ok: true; plan: OrganizationResponsePlan }
  | { ok: false; message: string };

let registry: OrganizationResponsePlan[] | null = null;
let storeInitialized = false;
let persistenceHydrated = false;
let registrySnapshot: OrganizationResponsePlan[] = [];
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function refreshSnapshot(): void {
  registrySnapshot = (registry ?? []).map(cloneOrganizationResponsePlan);
}

function applyRegistry(next: OrganizationResponsePlan[]): void {
  registry = next;
  storeInitialized = true;
  refreshSnapshot();
}

function syncRegistryFromStorage(): void {
  const persisted = loadResponsePlansFromStorage();
  if (persisted !== null) {
    applyRegistry(persisted);
    return;
  }
  if (!storeInitialized || registry === null) {
    applyRegistry([]);
  }
}

function ensureRegistry(): OrganizationResponsePlan[] {
  if (!storeInitialized || registry === null) {
    applyRegistry([]);
  }
  return registry!;
}

export function hydrateResponsePlansStoreFromPersistence(): void {
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
    if (event.key !== RESPONSE_PLANS_STORAGE_KEY) return;
    syncRegistryFromStorage();
    emitChange();
  });
}

attachCrossTabSync();

export function subscribeResponsePlansRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getResponsePlansSnapshot(): OrganizationResponsePlan[] {
  ensureRegistry();
  return registrySnapshot;
}

export function getResponsePlansServerSnapshot(): OrganizationResponsePlan[] {
  return [];
}

export function flushResponsePlansToStorage(): void {
  persistResponsePlansNow();
}

export function persistResponsePlansNow(): void {
  if (typeof window === "undefined") return;
  saveResponsePlansToStorage(ensureRegistry());
}

function commitRegistry(next: OrganizationResponsePlan[]): void {
  applyRegistry(next);
  if (persistenceHydrated) {
    saveResponsePlansToStorage(ensureRegistry());
  }
  emitChange();
}

export function getResponsePlanForOrganization(
  organizationId: string,
): OrganizationResponsePlan | null {
  return findResponsePlanByOrganizationId(ensureRegistry(), organizationId) ?? null;
}

export function getOrCreateResponsePlanForOrganization(
  organizationId: string,
  organizationName: string,
  user: { id: string; name: string },
  templateId: ResponsePlanTemplateId = "standard-flight-following",
): OrganizationResponsePlan {
  const existing = getResponsePlanForOrganization(organizationId);
  if (existing) return existing;

  const version = buildPlanVersionFromTemplate(
    templateId,
    organizationName,
    user,
    1,
  );
  const plan: OrganizationResponsePlan = {
    id: `orp-${createUniqueId()}`,
    organizationId,
    currentVersionNumber: 1,
    versions: [version],
    updatedAt: Date.now(),
  };
  commitRegistry(upsertOrganizationResponsePlan(ensureRegistry(), plan));
  return plan;
}

export function publishResponsePlanDraftInStore(
  organizationId: string,
  draft: OrganizationResponsePlanVersion,
  user: { id: string; name: string },
): ResponsePlanSaveResult {
  const existing = getResponsePlanForOrganization(organizationId);
  const nextVersionNumber =
    (existing?.versions.reduce(
      (max, v) => Math.max(max, v.versionNumber),
      0,
    ) ?? 0) + 1;

  const version: OrganizationResponsePlanVersion = {
    ...draft,
    versionNumber: nextVersionNumber,
    createdAt: Date.now(),
    createdByUserId: user.id,
    createdByUserName: user.name,
  };

  if (!existing) {
    const plan: OrganizationResponsePlan = {
      id: `orp-${createUniqueId()}`,
      organizationId,
      currentVersionNumber: version.versionNumber,
      versions: [version],
      updatedAt: Date.now(),
    };
    commitRegistry(upsertOrganizationResponsePlan(ensureRegistry(), plan));
    return { ok: true, plan };
  }

  const updated: OrganizationResponsePlan = {
    ...existing,
    currentVersionNumber: version.versionNumber,
    versions: [...existing.versions, version],
    updatedAt: Date.now(),
  };
  commitRegistry(upsertOrganizationResponsePlan(ensureRegistry(), updated));
  return { ok: true, plan: updated };
}

export function deleteResponsePlansForOrganizationInStore(
  organizationId: string,
): void {
  commitRegistry(deleteResponsePlansForOrganization(ensureRegistry(), organizationId));
}

export function resolvePlanVersionForEmergency(
  organizationId: string,
  organizationName: string,
  user: { id: string; name: string },
): OrganizationResponsePlanVersion {
  const plan = getOrCreateResponsePlanForOrganization(
    organizationId,
    organizationName,
    user,
  );
  const version = getCurrentPlanVersion(plan);
  if (!version) {
    throw new Error("Organization response plan has no version.");
  }
  return version;
}
