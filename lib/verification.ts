import {
  SYSTEM_OPERATOR_DISPLAY_NAME,
  SYSTEM_OPERATOR_USER_ID,
} from "./occ-operator";
import type { VerificationOutcome, VerificationRecord } from "./types";
import { VERIFICATION_OUTCOMES } from "./types";
import { createUniqueId } from "./unique-id";

const ACTION_LABELS: Record<VerificationOutcome, string> = {
  Airborne: "Position Check",
  "Landed Safely": "Flight Closeout",
  "Delayed Check-In": "Delay Follow-Up",
  Emergency: "Emergency Response",
  "Maintenance Issue": "Maintenance Escalation",
};

export function normalizeVerificationOutcome(value: unknown): VerificationOutcome {
  if (value === "Still Flying") return "Airborne";
  if (
    typeof value === "string" &&
    VERIFICATION_OUTCOMES.includes(value as VerificationOutcome)
  ) {
    return value as VerificationOutcome;
  }
  return "Airborne";
}

export function formatEmployeeAction(
  performedByUserName: string,
  outcome: VerificationOutcome,
): string {
  return `${performedByUserName} — ${ACTION_LABELS[outcome]}`;
}

export function createVerificationRecord(
  performedByUserId: string,
  performedByUserName: string,
  outcome: VerificationOutcome,
  notes: string,
  timestamp = Date.now(),
): VerificationRecord {
  return {
    id: createUniqueId(),
    performedByUserId,
    timestamp,
    employeeAction: formatEmployeeAction(performedByUserName, outcome),
    outcome,
    notes: notes.trim(),
  };
}

export function seedVerificationHistory(
  entries: Array<{
    minutesAgo: number;
    outcome: VerificationOutcome;
    notes: string;
    performedByUserId?: string;
    performedByUserName?: string;
  }>,
  now = Date.now(),
): VerificationRecord[] {
  return entries.map((entry) =>
    createVerificationRecord(
      entry.performedByUserId ?? SYSTEM_OPERATOR_USER_ID,
      entry.performedByUserName ?? SYSTEM_OPERATOR_DISPLAY_NAME,
      entry.outcome,
      entry.notes,
      now - entry.minutesAgo * 60_000,
    ),
  );
}
