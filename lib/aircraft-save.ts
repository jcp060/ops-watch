import {
  isValidEmergencyPhone,
  normalizeEmergencyPhone,
} from "./emergency-contact";
import { isKnownStateAbbr, reconcileAircraftMonitoringZone } from "./monitoring-region-config";
import type { Aircraft } from "./types";

export type AircraftSaveResult =
  | { ok: true; aircraft: Aircraft }
  | { ok: false; message: string };

export function validateAircraftForSave(
  aircraft: Aircraft,
  mode: "create" | "edit",
): AircraftSaveResult {
  if (!aircraft.id?.trim()) {
    return { ok: false, message: "Aircraft id is missing." };
  }
  if (!aircraft.tailNumber?.trim()) {
    return { ok: false, message: "Tail number is required." };
  }
  if (!aircraft.aircraftType?.trim()) {
    return { ok: false, message: "Aircraft type is required." };
  }
  if (!aircraft.homeState || !isKnownStateAbbr(aircraft.homeState)) {
    return { ok: false, message: "Select a valid home state." };
  }
  if (
    typeof aircraft.checkIntervalMinutes !== "number" ||
    aircraft.checkIntervalMinutes <= 0
  ) {
    return { ok: false, message: "Check interval must be greater than zero." };
  }

  const organizationId = (aircraft.organizationId ?? "").trim();
  const organizationName = (aircraft.organizationName ?? "").trim();
  const primaryContactName = (aircraft.primaryContactName ?? "").trim();
  const primaryContactPhone = normalizeEmergencyPhone(
    aircraft.primaryContactPhone ?? "",
  );
  const emergencyContactName = (aircraft.emergencyContactName ?? "").trim();
  const emergencyContactPhone = normalizeEmergencyPhone(
    aircraft.emergencyContactPhone ?? "",
  );
  const email = (aircraft.email ?? "").trim();

  const phoneFields: { label: string; value: string }[] = [
    { label: "Primary contact phone", value: primaryContactPhone },
    { label: "Emergency contact phone", value: emergencyContactPhone },
  ];

  for (const { label, value } of phoneFields) {
    if (value && !isValidEmergencyPhone(value)) {
      return {
        ok: false,
        message: `${label}: use 10–15 digits (+ prefix allowed for international).`,
      };
    }
  }

  if (emergencyContactPhone && !emergencyContactName) {
    return {
      ok: false,
      message: "Emergency contact name is required when a phone number is set.",
    };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid primary contact email." };
  }

  const reconciled = reconcileAircraftMonitoringZone({
    ...aircraft,
    tailNumber: aircraft.tailNumber.trim(),
    aircraftType: aircraft.aircraftType.trim(),
    organizationId,
    organizationName,
    primaryContactName,
    primaryContactPhone,
    homeState: aircraft.homeState.toUpperCase(),
    emergencyContactName,
    emergencyContactPhone,
    email,
  });

  return { ok: true, aircraft: reconciled };
}

export function prepareAircraftSave(
  draft: Aircraft,
  mode: "create" | "edit",
  existingIds: Set<string>,
): AircraftSaveResult {
  const validated = validateAircraftForSave(draft, mode);
  if (!validated.ok) return validated;

  if (mode === "create" && existingIds.has(validated.aircraft.id)) {
    return { ok: false, message: "An aircraft with this id already exists." };
  }

  return validated;
}
