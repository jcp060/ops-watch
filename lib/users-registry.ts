import type { OccUser } from "./types";

export function cloneUser(user: OccUser): OccUser {
  return { ...user };
}

export function updateUserInRegistry(
  registry: OccUser[],
  user: OccUser,
  mode: "create" | "edit",
): OccUser[] {
  const next = cloneUser(user);

  if (mode === "create") {
    if (registry.some((u) => u.id === next.id)) return registry;
    return [...registry, next];
  }

  const index = registry.findIndex((u) => u.id === next.id);
  if (index === -1) return registry;

  return registry.map((u) => (u.id === next.id ? next : u));
}

/** Removes user from registry only — does not touch flights, logs, or archives. */
export function deleteUserById(registry: OccUser[], id: string): OccUser[] {
  return registry.filter((u) => u.id !== id);
}

export function hasUniqueUserIds(registry: OccUser[]): boolean {
  const seen = new Set<string>();
  for (const { id } of registry) {
    if (!id || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}
