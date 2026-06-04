import { normalizeNotificationContacts } from "./response-plan-notifications";
import { cloneOrganizationResponsePlan } from "./response-plans-registry";
import type {
  OrganizationResponsePlan,
  OrganizationResponsePlanVersion,
  ResponsePlanChecklistItem,
  ResponsePlanItemType,
  ResponsePlanOverrides,
  ResponsePlanStep,
} from "./types";

export const RESPONSE_PLANS_STORAGE_KEY = "sentinel-occ:organization-response-plans";

const ITEM_TYPES: ResponsePlanItemType[] = [
  "checkbox",
  "notes",
  "text",
  "dropdown",
  "yes_no",
];

function normalizeItem(value: unknown): ResponsePlanChecklistItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.label !== "string") return null;
  const type = ITEM_TYPES.includes(row.type as ResponsePlanItemType)
    ? (row.type as ResponsePlanItemType)
    : "checkbox";
  const options = Array.isArray(row.options)
    ? row.options.filter((o): o is string => typeof o === "string")
    : undefined;
  return {
    id: row.id,
    label: row.label.trim(),
    type,
    required: row.required !== false,
    options,
  };
}

function normalizeStep(value: unknown): ResponsePlanStep | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  const items: ResponsePlanChecklistItem[] = [];
  if (Array.isArray(row.items)) {
    for (const entry of row.items) {
      const item = normalizeItem(entry);
      if (item) items.push(item);
    }
  }
  return {
    id: row.id,
    title: row.title.trim(),
    order: typeof row.order === "number" ? row.order : 0,
    items,
  };
}

function normalizeOverrides(value: unknown): ResponsePlanOverrides {
  const defaults: ResponsePlanOverrides = {
    notificationContacts: normalizeNotificationContacts(undefined),
    requiredInformation: {
      personsOnBoard: true,
      fuelRemaining: false,
      lastKnownCoordinates: true,
      medicalConcerns: false,
      missionType: false,
    },
  };
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  const requiredInformation = row.requiredInformation as
    | Record<string, unknown>
    | undefined;
  const contactsRaw =
    row.notificationContacts ?? row.notifications ?? undefined;
  return {
    notificationContacts: normalizeNotificationContacts(contactsRaw),
    requiredInformation: {
      personsOnBoard: requiredInformation?.personsOnBoard !== false,
      fuelRemaining: requiredInformation?.fuelRemaining === true,
      lastKnownCoordinates: requiredInformation?.lastKnownCoordinates !== false,
      medicalConcerns: requiredInformation?.medicalConcerns === true,
      missionType: requiredInformation?.missionType === true,
    },
  };
}

function normalizeVersion(value: unknown): OrganizationResponsePlanVersion | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.versionNumber !== "number" ||
    typeof row.planName !== "string" ||
    typeof row.createdAt !== "number" ||
    typeof row.createdByUserId !== "string" ||
    typeof row.createdByUserName !== "string"
  ) {
    return null;
  }
  const steps: ResponsePlanStep[] = [];
  if (Array.isArray(row.steps)) {
    for (const entry of row.steps) {
      const step = normalizeStep(entry);
      if (step) steps.push(step);
    }
  }
  return {
    versionNumber: row.versionNumber,
    planName: row.planName.trim(),
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId,
    createdByUserName: row.createdByUserName.trim(),
    steps,
    overrides: normalizeOverrides(row.overrides),
  };
}

function normalizePlan(value: unknown): OrganizationResponsePlan | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.organizationId !== "string" ||
    typeof row.currentVersionNumber !== "number" ||
    typeof row.updatedAt !== "number"
  ) {
    return null;
  }
  const versions: OrganizationResponsePlanVersion[] = [];
  if (Array.isArray(row.versions)) {
    for (const entry of row.versions) {
      const version = normalizeVersion(entry);
      if (version) versions.push(version);
    }
  }
  if (versions.length === 0) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    currentVersionNumber: row.currentVersionNumber,
    versions,
    updatedAt: row.updatedAt,
  };
}

export function parsePersistedResponsePlans(raw: string): OrganizationResponsePlan[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map(normalizePlan)
      .filter((row): row is OrganizationResponsePlan => row !== null);
  } catch {
    return null;
  }
}

export function loadResponsePlansFromStorage(): OrganizationResponsePlan[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RESPONSE_PLANS_STORAGE_KEY);
  if (!raw) return null;
  return parsePersistedResponsePlans(raw);
}

export function saveResponsePlansToStorage(plans: OrganizationResponsePlan[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    RESPONSE_PLANS_STORAGE_KEY,
    JSON.stringify(plans.map(cloneOrganizationResponsePlan)),
  );
}
