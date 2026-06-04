"use client";

import { Phone } from "lucide-react";
import {
  formatPhoneInputMask,
  isValidPhoneInputCharacters,
} from "@/lib/emergency-contact";

export type EmergencyContactFormSlice = {
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type EmergencyContactFormFieldsProps = {
  values: EmergencyContactFormSlice;
  readOnly?: boolean;
  onChange: (patch: Partial<EmergencyContactFormSlice>) => void;
};

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-base text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";

export function EmergencyContactFormFields({
  values,
  readOnly = false,
  onChange,
}: EmergencyContactFormFieldsProps) {
  const handlePhoneChange = (raw: string) => {
    if (!isValidPhoneInputCharacters(raw)) return;
    onChange({ emergencyContactPhone: formatPhoneInputMask(raw) });
  };

  return (
    <fieldset
      className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-4"
      disabled={readOnly}
    >
      <legend className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/90">
        <Phone className="size-3.5" aria-hidden />
        Emergency contact
      </legend>
      {readOnly ? (
        <p className="text-xs text-slate-500">
          Only Admin and Supervisor roles can edit emergency contact information.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Used by OCC during active flight monitoring and emergencies. US and
          international formats supported (+ prefix).
        </p>
      )}
      <div>
        <label
          htmlFor="ac-emergency-name"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Emergency contact name
        </label>
        <input
          id="ac-emergency-name"
          type="text"
          autoComplete="name"
          value={values.emergencyContactName}
          onChange={(e) =>
            onChange({ emergencyContactName: e.target.value })
          }
          placeholder="John Smith"
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="ac-emergency-phone"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Emergency contact phone
        </label>
        <input
          id="ac-emergency-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.emergencyContactPhone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="(555) 555-5555 or +1 555 555 5555"
          className={inputClass}
        />
      </div>
    </fieldset>
  );
}
