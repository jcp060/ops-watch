"use client";

import { Phone, UserRound } from "lucide-react";
import {
  EMERGENCY_CONTACT_EMPTY_MESSAGE,
  formatEmergencyPhoneDisplay,
  hasEmergencyContact,
} from "@/lib/emergency-contact";

type EmergencyContactDisplayProps = {
  name?: string;
  phone?: string;
  compact?: boolean;
  className?: string;
};

export function EmergencyContactDisplay({
  name,
  phone,
  compact = false,
  className = "",
}: EmergencyContactDisplayProps) {
  const hasContact = hasEmergencyContact(name, phone);
  const displayPhone = formatEmergencyPhoneDisplay(phone ?? "");
  const telHref = phone?.trim()
    ? `tel:${phone.replace(/\s/g, "")}`
    : undefined;

  if (!hasContact) {
    return (
      <p
        className={`text-sm italic text-slate-500 ${className}`}
        data-testid="emergency-contact-empty"
      >
        {EMERGENCY_CONTACT_EMPTY_MESSAGE}
      </p>
    );
  }

  return (
    <div
      className={`rounded-lg border border-amber-500/25 bg-amber-500/[0.06] ${
        compact ? "px-3 py-2" : "px-4 py-3"
      } ${className}`}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
        <Phone className="size-3 shrink-0" aria-hidden />
        Emergency contact
      </p>
      <div className={`mt-2 space-y-1.5 ${compact ? "text-xs" : "text-sm"}`}>
        {name?.trim() ? (
          <p className="flex items-center gap-2 font-medium text-slate-100">
            <UserRound className="size-3.5 shrink-0 text-amber-400/80" aria-hidden />
            {name.trim()}
          </p>
        ) : null}
        {displayPhone ? (
          <p className="flex items-center gap-2">
            <Phone className="size-3.5 shrink-0 text-cyan-400/80" aria-hidden />
            {telHref ? (
              <a
                href={telHref}
                className="font-mono font-semibold text-cyan-300 underline-offset-2 hover:text-cyan-200 hover:underline"
              >
                {displayPhone}
              </a>
            ) : (
              <span className="font-mono font-semibold text-cyan-300">
                {displayPhone}
              </span>
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
