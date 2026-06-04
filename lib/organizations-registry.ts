import type { Organization } from "./types";

export function cloneOrganization(org: Organization): Organization {
  return { ...org };
}

export function updateOrganizationInRegistry(
  registry: Organization[],
  organization: Organization,
  mode: "create" | "edit",
): Organization[] {
  const next = cloneOrganization(organization);

  if (mode === "create") {
    if (registry.some((entry) => entry.id === next.id)) return registry;
    return [...registry, next];
  }

  const index = registry.findIndex((entry) => entry.id === next.id);
  if (index === -1) return registry;
  return registry.map((entry) => (entry.id === next.id ? next : entry));
}

export function deleteOrganizationById(
  registry: Organization[],
  id: string,
): Organization[] {
  return registry.filter((entry) => entry.id !== id);
}

export function hasUniqueOrganizationIds(registry: Organization[]): boolean {
  const seen = new Set<string>();
  for (const { id } of registry) {
    if (!id || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

export function findOrganizationById(
  registry: Organization[],
  id: string,
): Organization | undefined {
  return registry.find((entry) => entry.id === id);
}
