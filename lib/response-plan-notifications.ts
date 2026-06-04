import { createUniqueId } from "./unique-id";
import {
  formatEmergencyPhoneDisplay,
  normalizeEmergencyPhone,
} from "./emergency-contact";
import type {
  EmergencyContactOutcome,
  ResponsePlanNotificationContact,
  ResponsePlanNotificationCompletion,
} from "./types";

const LEGACY_NOTIFICATION_LABELS: Record<string, string> = {
  operationsManager: "Operations Manager",
  chiefPilot: "Chief Pilot",
  safetyOfficer: "Safety Officer",
  customer: "Customer",
  faa: "FAA",
  ntsb: "NTSB",
  sar: "SAR",
};

export function createNotificationContact(
  label: string,
  required = true,
  phone = "",
  name = "",
): ResponsePlanNotificationContact {
  return {
    id: `notify-${createUniqueId()}`,
    label: label.trim(),
    name: name.trim(),
    phone: normalizeEmergencyPhone(phone),
    required,
  };
}

export function defaultNotificationContacts(): ResponsePlanNotificationContact[] {
  return [
    createNotificationContact("Operations Manager"),
    createNotificationContact("Chief Pilot"),
    createNotificationContact("Safety Officer", false),
    createNotificationContact("Landing Facility", false),
    createNotificationContact("Customer", false),
    createNotificationContact("FAA", false),
    createNotificationContact("NTSB", false),
    createNotificationContact("SAR", false),
  ];
}

export function cloneNotificationContacts(
  contacts: ResponsePlanNotificationContact[],
): ResponsePlanNotificationContact[] {
  return contacts.map((contact) => ({ ...contact }));
}

export function normalizeNotificationContact(
  value: unknown,
): ResponsePlanNotificationContact | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.label !== "string") return null;
  const label = row.label.trim();
  if (!label) return null;
  return {
    id: row.id,
    label,
    name: typeof row.name === "string" ? row.name.trim() : "",
    phone:
      typeof row.phone === "string" ? normalizeEmergencyPhone(row.phone) : "",
    required: row.required !== false,
  };
}

export function normalizeNotificationContacts(
  value: unknown,
): ResponsePlanNotificationContact[] {
  if (Array.isArray(value)) {
    const result: ResponsePlanNotificationContact[] = [];
    for (const entry of value) {
      const contact = normalizeNotificationContact(entry);
      if (contact) result.push(contact);
    }
    if (result.length > 0) return result;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    const migrated: ResponsePlanNotificationContact[] = [];
    for (const [key, enabled] of Object.entries(row)) {
      const label = LEGACY_NOTIFICATION_LABELS[key];
      if (!label || enabled !== true) continue;
      migrated.push(createNotificationContact(label));
    }
    if (migrated.length > 0) return migrated;
  }

  return defaultNotificationContacts();
}

export function createEmptyNotificationCompletion(
  contactId: string,
): ResponsePlanNotificationCompletion {
  return {
    contactId,
    outcome: null,
    completedAt: null,
    completedByUserId: "",
    completedByUserName: "",
  };
}

export function buildNotificationCompletions(
  contacts: ResponsePlanNotificationContact[],
  existing?: Record<string, ResponsePlanNotificationCompletion>,
): Record<string, ResponsePlanNotificationCompletion> {
  const result: Record<string, ResponsePlanNotificationCompletion> = {};
  for (const contact of contacts) {
    result[contact.id] =
      existing?.[contact.id] ?? createEmptyNotificationCompletion(contact.id);
  }
  return result;
}

export function formatNotificationTimelineEntry(
  contact: ResponsePlanNotificationContact,
  outcome: EmergencyContactOutcome,
  userName: string,
): string {
  const role = contact.label.trim() || "Contact";
  switch (outcome) {
    case "Contacted":
      return `${role} notified by ${userName}`;
    case "Left Message":
      return `${role} voicemail left by ${userName}`;
    case "Unable to Reach":
      return `${role} no answer by ${userName}`;
  }
}

export function formatNotificationContactsForReport(
  contacts: ResponsePlanNotificationContact[],
  completions?: Record<string, ResponsePlanNotificationCompletion>,
): string {
  return contacts
    .map((contact) => {
      const completion = completions?.[contact.id];
      const outcome = completion?.outcome;
      const phone = contact.phone
        ? formatEmergencyPhoneDisplay(contact.phone)
        : "";
      const person = contact.name.trim() || contact.label;
      const base = phone ? `${person}: ${phone}` : person;
      return outcome ? `${base} (${outcome})` : base;
    })
    .join("\n");
}
