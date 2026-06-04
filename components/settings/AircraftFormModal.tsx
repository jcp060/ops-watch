"use client";

import { AircraftOperationalContactFields } from "@/components/aircraft/AircraftOperationalContactFields";
import { FormDialog } from "@/components/FormDialog";
import { ZoneBadge } from "@/components/ZoneBadge";
import { cloneAircraft } from "@/lib/aircraft-registry";
import {
  clearOrganizationFromAircraft,
  contactsFromOrganization,
} from "@/lib/organization-aircraft";
import {
  getZoneForStateAbbr,
  US_STATE_SELECT_OPTIONS,
} from "@/lib/monitoring-region-config";
import type { Aircraft, EntityStatus, MonitoringZone, Organization } from "@/lib/types";

export type AircraftFormValues = {
  tailNumber: string;
  aircraftType: string;
  organizationId: string;
  organizationName: string;
  primaryContactName: string;
  primaryContactPhone: string;
  homeState: string;
  monitoringZone: MonitoringZone;
  checkIntervalMinutes: number;
  status: EntityStatus;
  emergencyContactName: string;
  emergencyContactPhone: string;
  email: string;
};

type AircraftFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  values: AircraftFormValues;
  saveError?: string | null;
  organizations: Organization[];
  canEditEmergencyContact?: boolean;
  onChange: (values: AircraftFormValues) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function AircraftFormModal({
  isOpen,
  mode,
  values,
  saveError,
  organizations,
  canEditEmergencyContact = true,
  onChange,
  onSubmit,
  onClose,
}: AircraftFormModalProps) {
  const update = (patch: Partial<AircraftFormValues>) =>
    onChange({ ...values, ...patch });

  const handleStateChange = (homeState: string) => {
    const monitoringZone = getZoneForStateAbbr(homeState) ?? values.monitoringZone;
    update({ homeState, monitoringZone });
  };

  const handleOrganizationChange = (organizationId: string) => {
    if (!organizationId) {
      update({
        ...clearOrganizationFromAircraft(),
        organizationId: "",
        organizationName: "",
      });
      return;
    }

    const org = organizations.find((entry) => entry.id === organizationId);
    if (org) {
      update(contactsFromOrganization(org));
      return;
    }

    update({
      organizationId,
      organizationName: "Unknown organization",
    });
  };

  const sortedOrganizations = [...organizations].sort((a, b) =>
    a.organizationName.localeCompare(b.organizationName),
  );
  const orgMissing =
    values.organizationId &&
    !organizations.some((o) => o.id === values.organizationId);

  return (
    <FormDialog
      title={mode === "create" ? "Add Aircraft" : "Edit Aircraft"}
      subtitle={
        mode === "create"
          ? "Adds aircraft to the fleet registry."
          : "Updates registry details for this aircraft."
      }
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={mode === "create" ? "Add Aircraft" : "Save Changes"}
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
      <Field label="Tail Number" id="ac-tail">
        <input
          id="ac-tail"
          required
          value={values.tailNumber}
          onChange={(e) => update({ tailNumber: e.target.value.toUpperCase() })}
          placeholder="N12345A"
          className={inputClass}
        />
      </Field>
      <Field label="Aircraft Type" id="ac-type">
        <input
          id="ac-type"
          required
          value={values.aircraftType}
          onChange={(e) => update({ aircraftType: e.target.value })}
          placeholder="Cessna 172"
          className={inputClass}
        />
      </Field>
      <Field label="Organization" id="ac-organization">
        <select
          id="ac-organization"
          value={values.organizationId}
          onChange={(e) => handleOrganizationChange(e.target.value)}
          className={inputClass}
        >
          <option value="">— None —</option>
          {orgMissing ? (
            <option value={values.organizationId}>
              {values.organizationName || "Missing organization"} (unlinked)
            </option>
          ) : null}
          {sortedOrganizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.organizationName}
            </option>
          ))}
        </select>
        {orgMissing ? (
          <p className="mt-1 text-xs text-amber-400/90">
            Linked organization was removed. Select a new organization or clear the
            field.
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Contacts below fill automatically when an organization is selected.
          </p>
        )}
      </Field>
      <AircraftOperationalContactFields
        values={{
          primaryContactName: values.primaryContactName,
          primaryContactPhone: values.primaryContactPhone,
          emergencyContactName: values.emergencyContactName,
          emergencyContactPhone: values.emergencyContactPhone,
          email: values.email,
        }}
        readOnlyEmergency={!canEditEmergencyContact}
        onChange={(patch) => update(patch)}
      />
      <Field label="Home State" id="ac-state">
        <select
          id="ac-state"
          required
          value={values.homeState}
          onChange={(e) => handleStateChange(e.target.value)}
          className={inputClass}
        >
          {US_STATE_SELECT_OPTIONS.map((option) => (
            <option key={option.abbr} value={option.abbr}>
              {option.name} ({option.abbr})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Monitoring region is assigned from state using the OCC region map.
        </p>
      </Field>
      <Field label="Monitoring Zone" id="ac-zone">
        <div
          id="ac-zone"
          className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2.5"
          aria-readonly
        >
          <ZoneBadge zone={values.monitoringZone} />
          <span className="text-xs text-slate-500">
            Read-only · updates when home state changes
          </span>
        </div>
      </Field>
      <Field label="Check Interval (minutes)" id="ac-interval">
        <input
          id="ac-interval"
          type="number"
          required
          min={1}
          max={120}
          value={values.checkIntervalMinutes}
          onChange={(e) =>
            update({ checkIntervalMinutes: Number(e.target.value) })
          }
          className={inputClass}
        />
      </Field>
      {mode === "edit" && (
        <Field label="Status" id="ac-status">
          <select
            id="ac-status"
            value={values.status}
            onChange={(e) => update({ status: e.target.value as EntityStatus })}
            className={inputClass}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </Field>
      )}
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

export const emptyAircraftForm = (): AircraftFormValues => ({
  tailNumber: "",
  aircraftType: "",
  organizationId: "",
  organizationName: "",
  primaryContactName: "",
  primaryContactPhone: "",
  homeState: "TX",
  monitoringZone: "Central",
  checkIntervalMinutes: 10,
  status: "Active",
  emergencyContactName: "",
  emergencyContactPhone: "",
  email: "",
});

export function configToForm(config: Aircraft): AircraftFormValues {
  const snapshot = cloneAircraft(config);
  return {
    tailNumber: snapshot.tailNumber,
    aircraftType: snapshot.aircraftType,
    organizationId: snapshot.organizationId,
    organizationName: snapshot.organizationName,
    primaryContactName: snapshot.primaryContactName,
    primaryContactPhone: snapshot.primaryContactPhone,
    homeState: snapshot.homeState,
    monitoringZone: snapshot.monitoringZone,
    checkIntervalMinutes: snapshot.checkIntervalMinutes,
    status: snapshot.status,
    emergencyContactName: snapshot.emergencyContactName,
    emergencyContactPhone: snapshot.emergencyContactPhone,
    email: snapshot.email,
  };
}
