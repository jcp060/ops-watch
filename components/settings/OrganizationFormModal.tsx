"use client";

import { EmergencyContactFormFields } from "@/components/aircraft/EmergencyContactFormFields";
import { FormDialog } from "@/components/FormDialog";
import { formatPhoneInputMask } from "@/lib/emergency-contact";
import type { Organization } from "@/lib/types";

export type OrganizationFormValues = {
  organizationName: string;
  primaryContactName: string;
  primaryContactPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  email: string;
  address: string;
  notes: string;
};

type OrganizationFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  values: OrganizationFormValues;
  saveError?: string | null;
  onChange: (values: OrganizationFormValues) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function OrganizationFormModal({
  isOpen,
  mode,
  values,
  saveError,
  onChange,
  onSubmit,
  onClose,
}: OrganizationFormModalProps) {
  const update = (patch: Partial<OrganizationFormValues>) =>
    onChange({ ...values, ...patch });

  return (
    <FormDialog
      title={mode === "create" ? "Add Organization" : "Edit Organization"}
      subtitle="Fleet operator profile — aircraft inherit these contacts when assigned."
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={mode === "create" ? "Create Organization" : "Save Changes"}
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      {saveError ? (
        <p
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {saveError}
        </p>
      ) : null}
      <Field label="Organization name" id="org-name">
        <input
          id="org-name"
          required
          value={values.organizationName}
          onChange={(e) => update({ organizationName: e.target.value })}
          placeholder="Sentinel Air"
          className={inputClass}
        />
      </Field>
      <Field label="Primary contact name" id="org-primary-name">
        <input
          id="org-primary-name"
          value={values.primaryContactName}
          onChange={(e) => update({ primaryContactName: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Primary contact phone" id="org-primary-phone">
        <input
          id="org-primary-phone"
          type="tel"
          inputMode="tel"
          value={values.primaryContactPhone}
          onChange={(e) =>
            update({ primaryContactPhone: formatPhoneInputMask(e.target.value) })
          }
          className={inputClass}
        />
      </Field>
      <Field label="Primary contact email" id="org-primary-email">
        <input
          id="org-primary-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => update({ email: e.target.value })}
          className={inputClass}
        />
      </Field>
      <EmergencyContactFormFields
        values={{
          emergencyContactName: values.emergencyContactName,
          emergencyContactPhone: values.emergencyContactPhone,
        }}
        onChange={(patch) => update(patch)}
      />
      <Field label="Address" id="org-address">
        <input
          id="org-address"
          value={values.address}
          onChange={(e) => update({ address: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Notes" id="org-notes">
        <textarea
          id="org-notes"
          rows={2}
          value={values.notes}
          onChange={(e) => update({ notes: e.target.value })}
          className={`${inputClass} resize-y`}
        />
      </Field>
    </FormDialog>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30";

export const emptyOrganizationForm = (): OrganizationFormValues => ({
  organizationName: "",
  primaryContactName: "",
  primaryContactPhone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  email: "",
  address: "",
  notes: "",
});

export function organizationToForm(org: Organization): OrganizationFormValues {
  return {
    organizationName: org.organizationName,
    primaryContactName: org.primaryContactName,
    primaryContactPhone: org.primaryContactPhone,
    emergencyContactName: org.emergencyContactName,
    emergencyContactPhone: org.emergencyContactPhone,
    email: org.email,
    address: org.address,
    notes: org.notes,
  };
}
