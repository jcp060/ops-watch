import {
  ArchiveRetentionError,
  assertArchivedFlightDeletable,
} from "./archive-retention";

export type ArchiveDeleteApiResponse =
  | { ok: true }
  | {
      ok: false;
      error: "RETENTION_LOCKED" | "NOT_FOUND" | "BAD_REQUEST";
      message: string;
      unlockAt?: number;
    };

export type ArchiveDeletionValidation =
  | { allowed: true; archivedAt: number }
  | ArchiveDeleteApiResponse;

/** Server-side retention gate (mirrors archive store rules). */
export function validateArchiveDeletionRequest(
  archivedAt: unknown,
  now = Date.now(),
): ArchiveDeletionValidation {
  if (typeof archivedAt !== "number" || !Number.isFinite(archivedAt)) {
    return {
      ok: false,
      error: "BAD_REQUEST",
      message: "archivedAt (epoch ms) is required.",
    };
  }

  try {
    assertArchivedFlightDeletable(archivedAt, now);
    return { allowed: true, archivedAt };
  } catch (error) {
    if (error instanceof ArchiveRetentionError) {
      return {
        ok: false,
        error: "RETENTION_LOCKED",
        message: error.message,
        unlockAt: error.unlockAt,
      };
    }
    throw error;
  }
}

/** Client: request API approval before local delete (defense in depth). */
export async function requestArchivedFlightDeletion(
  id: string,
  archivedAt: number,
): Promise<void> {
  const response = await fetch(`/api/archived-flights/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archivedAt }),
  });

  const payload = (await response.json()) as
    | { ok: true }
    | ArchiveDeleteApiResponse;

  if (!response.ok || ("ok" in payload && payload.ok === false)) {
    const blocked = "ok" in payload && payload.ok === false ? payload : null;
    const message =
      blocked?.message ?? "Deletion was blocked by retention policy.";
    if (blocked?.unlockAt !== undefined) {
      throw new ArchiveRetentionError(archivedAt, blocked.unlockAt);
    }
    throw new Error(message);
  }
}
