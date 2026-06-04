import { COMMAND_MAP_ROLE_COOKIE } from "@/lib/access-control";
import type { OccUser } from "@/lib/types";

export const CURRENT_USER_STORAGE_KEY = "sentinel-occ:current-user-id";

let currentUserId: string | null = null;
let storeInitialized = false;
const listeners = new Set<() => void>();

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function syncRoleCookie(role: OccUser["role"] | null): void {
  if (typeof document === "undefined") return;
  if (!role) {
    document.cookie = `${COMMAND_MAP_ROLE_COOKIE}=; path=/; max-age=0`;
    return;
  }
  document.cookie = `${COMMAND_MAP_ROLE_COOKIE}=${encodeURIComponent(role)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentUserIdSnapshot(): string | null {
  if (!storeInitialized) {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    currentUserId = stored;
    storeInitialized = true;
  }
  return currentUserId;
}

export function resolveCurrentUser(users: OccUser[]): OccUser | null {
  const id = getCurrentUserIdSnapshot();
  if (id) {
    const match = users.find((user) => user.id === id);
    if (match) return match;
  }

  const fallback =
    users.find((user) => user.role === "Admin" && user.status === "Active") ??
    users.find((user) => user.role === "Supervisor" && user.status === "Active") ??
    users.find((user) => user.status === "Active") ??
    users[0] ??
    null;

  if (fallback) {
    setCurrentUserId(fallback.id, fallback.role);
  }

  return fallback;
}

export function setCurrentUserId(userId: string, role: OccUser["role"]): void {
  currentUserId = userId;
  storeInitialized = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, userId);
  }
  syncRoleCookie(role);
  emitChange();
}
