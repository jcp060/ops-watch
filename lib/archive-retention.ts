import type { ArchivedFlight } from "./types";

/** 14 days in milliseconds (336 hours). */
export const ARCHIVE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export type ArchiveRetentionErrorCode = "RETENTION_LOCKED" | "NOT_FOUND";

export class ArchiveRetentionError extends Error {
  readonly code: ArchiveRetentionErrorCode;
  readonly archivedAt: number;
  readonly unlockAt: number;

  constructor(archivedAt: number, unlockAt: number) {
    super(
      `Archived flight is locked until ${new Date(unlockAt).toISOString()} (14-day retention).`,
    );
    this.name = "ArchiveRetentionError";
    this.code = "RETENTION_LOCKED";
    this.archivedAt = archivedAt;
    this.unlockAt = unlockAt;
  }
}

export function getArchivedAt(flight: ArchivedFlight): number {
  return flight.archivedAt ?? flight.landingTime;
}

export function getArchiveRetentionUnlockAt(archivedAt: number): number {
  return archivedAt + ARCHIVE_RETENTION_MS;
}

export function canDeleteArchivedFlight(
  archivedAt: number,
  now = Date.now(),
): boolean {
  return now - archivedAt >= ARCHIVE_RETENTION_MS;
}

export function assertArchivedFlightDeletable(
  archivedAt: number,
  now = Date.now(),
): void {
  if (canDeleteArchivedFlight(archivedAt, now)) return;
  throw new ArchiveRetentionError(
    archivedAt,
    getArchiveRetentionUnlockAt(archivedAt),
  );
}

export function getDaysUntilArchiveDeletion(
  archivedAt: number,
  now = Date.now(),
): number {
  const remainingMs = getArchiveRetentionUnlockAt(archivedAt) - now;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export function formatArchiveRetentionStatus(
  archivedAt: number,
  now = Date.now(),
): {
  locked: boolean;
  label: string;
  lockedUntilLabel: string;
  unlockAt: number;
} {
  const unlockAt = getArchiveRetentionUnlockAt(archivedAt);
  const lockedUntilLabel = `Locked until ${new Date(unlockAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  if (canDeleteArchivedFlight(archivedAt, now)) {
    return {
      locked: false,
      label: "Eligible for permanent deletion",
      lockedUntilLabel,
      unlockAt,
    };
  }

  const daysRemaining = getDaysUntilArchiveDeletion(archivedAt, now);
  if (daysRemaining <= 1) {
    const hoursRemaining = Math.max(
      1,
      Math.ceil((unlockAt - now) / (60 * 60 * 1000)),
    );
    return {
      locked: true,
      label: `Available for deletion in ${hoursRemaining} hour${hoursRemaining === 1 ? "" : "s"}`,
      lockedUntilLabel,
      unlockAt,
    };
  }

  return {
    locked: true,
    label: `Available for deletion in ${daysRemaining} days`,
    lockedUntilLabel,
    unlockAt,
  };
}
