"use client";

import { EmergencyContactFormFields } from "@/components/aircraft/EmergencyContactFormFields";
import { formatPhoneInputMask } from "@/lib/emergency-contact";

export type AircraftOperationalContactSlice = {
  primaryContactName: string;
  primaryContactPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  email: string;
};

type AircraftOperationalContactFieldsProps = {
  values: AircraftOperationalContactSlice;
  readOnlyEmergency?: boolean;
  onChange: (patch: Partial<AircraftOperationalContactSlice>) => void;
};

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-base text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";

export function AircraftOperationalContactFields({
  values,
  readOnlyEmergency = false,
  onChange,
}: AircraftOperationalContactFieldsProps) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-900/30 px-4 py-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Operational contacts
      </legend>
      <p className="text-xs text-slate-500">
        Inherited from the selected organization. You can override any field for
        this aircraft.
      </p>
      <div>
        <label
          htmlFor="ac-primary-name"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Primary contact name
        </label>
        <input
          id="ac-primary-name"
          value={values.primaryContactName}
          onChange={(e) => onChange({ primaryContactName: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="ac-primary-phone"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Primary contact phone
        </label>
        <input
          id="ac-primary-phone"
          type="tel"
          inputMode="tel"
          value={values.primaryContactPhone}
          onChange={(e) =>
            onChange({ primaryContactPhone: formatPhoneInputMask(e.target.value) })
          }
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="ac-primary-email"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Primary contact email
        </label>
        <input
          id="ac-primary-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={inputClass}
        />
      </div>
      <EmergencyContactFormFields
        values={{
          emergencyContactName: values.emergencyContactName,
          emergencyContactPhone: values.emergencyContactPhone,
        }}
        readOnly={readOnlyEmergency}
        onChange={(patch) => onChange(patch)}
      />
    </fieldset>
  );
}
