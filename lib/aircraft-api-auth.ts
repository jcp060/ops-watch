import { cookies } from "next/headers";
import {
  canEditAircraftEmergencyContact,
  COMMAND_MAP_ROLE_COOKIE,
} from "./access-control";
import type { UserRole } from "./types";

export function parseSessionRole(raw: string | undefined): UserRole | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  if (
    decoded === "Admin" ||
    decoded === "Supervisor" ||
    decoded === "OCC Operator"
  ) {
    return decoded;
  }
  return null;
}

export async function getApiSessionRole(): Promise<UserRole | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COMMAND_MAP_ROLE_COOKIE)?.value;
  return parseSessionRole(raw);
}

export function canMutateAircraftViaApi(role: UserRole | null): boolean {
  if (!role) return false;
  return canEditAircraftEmergencyContact(role);
}
