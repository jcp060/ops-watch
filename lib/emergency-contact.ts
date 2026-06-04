/** Minimum digits for a stored phone (US/local or international). */
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

const PHONE_INPUT_PATTERN = /^[\d\s().+\-]*$/;

/** Loose E.164-friendly: optional +, 10–15 digits total. */
const PHONE_VALIDATION = /^\+?[\d\s().\-]{10,20}$/;

export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeEmergencyPhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const digits = digitsOnlyPhone(trimmed);
  if (!digits) return "";
  const hasPlus = trimmed.startsWith("+");
  return hasPlus ? `+${digits}` : digits;
}

export function isValidEmergencyPhone(value: string): boolean {
  const normalized = normalizeEmergencyPhone(value);
  if (!normalized) return true;
  if (!PHONE_VALIDATION.test(value.trim())) return false;
  const digitCount = digitsOnlyPhone(normalized).length;
  return digitCount >= MIN_PHONE_DIGITS && digitCount <= MAX_PHONE_DIGITS;
}

export function isValidPhoneInputCharacters(value: string): boolean {
  return PHONE_INPUT_PATTERN.test(value);
}

/** Format for display and tel: links — preserves leading + when present. */
export function formatEmergencyPhoneDisplay(value: string): string {
  const normalized = normalizeEmergencyPhone(value);
  if (!normalized) return "";

  const digits = digitsOnlyPhone(normalized);
  const international = normalized.startsWith("+");

  if (!international && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (!international && digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (international) {
    return `+${digits}`;
  }

  return normalized;
}

export function formatPhoneInputMask(value: string): string {
  if (!value.trim()) return "";
  if (value.trim().startsWith("+")) {
    const digits = digitsOnlyPhone(value);
    return digits ? `+${digits}` : "+";
  }

  const digits = digitsOnlyPhone(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
}

export function hasEmergencyContact(
  name: string | undefined,
  phone: string | undefined,
): boolean {
  return Boolean(name?.trim() || normalizeEmergencyPhone(phone ?? ""));
}

export const EMERGENCY_CONTACT_EMPTY_MESSAGE =
  "No emergency contact assigned";
