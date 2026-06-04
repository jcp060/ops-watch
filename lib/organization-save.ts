import {
  isValidEmergencyPhone,
  normalizeEmergencyPhone,
} from "./emergency-contact";
import type { Organization } from "./types";

export type OrganizationSaveResult =
  | { ok: true; organization: Organization }
  | { ok: false; message: string };

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function validateOrganizationForSave(
  organization: Organization,
  registry: Organization[],
  mode: "create" | "edit",
): OrganizationSaveResult {
  if (!organization.id?.trim()) {
    return { ok: false, message: "Organization id is missing." };
  }

  const organizationName = organization.organizationName.trim();
  if (!organizationName) {
    return { ok: false, message: "Organization name is required." };
  }

  const nameKey = normalizeNameKey(organizationName);
  const duplicate = registry.some(
    (entry) =>
      normalizeNameKey(entry.organizationName) === nameKey &&
      (mode === "create" || entry.id !== organization.id),
  );
  if (duplicate) {
    return {
      ok: false,
      message: "An organization with this name already exists.",
    };
  }

  const phones = [
    organization.primaryContactPhone,
    organization.emergencyContactPhone,
  ];

  for (const phone of phones) {
    const normalized = normalizeEmergencyPhone(phone);
    if (normalized && !isValidEmergencyPhone(normalized)) {
      return {
        ok: false,
        message:
          "Enter valid phone numbers (10–15 digits; + prefix allowed for international).",
      };
    }
  }

  if (
    normalizeEmergencyPhone(organization.emergencyContactPhone) &&
    !organization.emergencyContactName.trim()
  ) {
    return {
      ok: false,
      message: "Emergency contact name is required when a phone number is set.",
    };
  }

  const email = organization.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid primary contact email." };
  }

  return {
    ok: true,
    organization: {
      ...organization,
      organizationName,
      primaryContactName: organization.primaryContactName.trim(),
      primaryContactPhone: normalizeEmergencyPhone(
        organization.primaryContactPhone,
      ),
      emergencyContactName: organization.emergencyContactName.trim(),
      emergencyContactPhone: normalizeEmergencyPhone(
        organization.emergencyContactPhone,
      ),
      email,
      address: organization.address.trim(),
      notes: organization.notes.trim(),
    },
  };
}

export function prepareOrganizationSave(
  draft: Organization,
  mode: "create" | "edit",
  registry: Organization[],
): OrganizationSaveResult {
  return validateOrganizationForSave(draft, registry, mode);
}
