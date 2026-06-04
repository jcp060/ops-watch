"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canEditAircraftEmergencyContact } from "@/lib/access-control";
import { filterAircraftRegistry } from "@/lib/aircraft-registry-search";
import { cloneAircraft } from "@/lib/aircraft-registry";
import { formatEmergencyPhoneDisplay } from "@/lib/emergency-contact";
import { EntityStatusBadge } from "@/components/EntityStatusBadge";
import { ZoneBadge } from "@/components/ZoneBadge";
import {
  AircraftFormModal,
  configToForm,
  emptyAircraftForm,
  type AircraftFormValues,
} from "@/components/settings/AircraftFormModal";
import { DeleteAircraftModal } from "@/components/settings/DeleteAircraftModal";
import { prepareAircraftSave, type AircraftSaveResult } from "@/lib/aircraft-save";
import type { Aircraft, OccUser, Organization } from "@/lib/types";

type AircraftSettingsTabProps = {
  users: OccUser[];
  organizations: Organization[];
  aircraft: Aircraft[];
  /** Used only for delete confirmation warning — no flight actions in Settings. */
  aircraftIdsInFlight?: Set<string>;
  onSaveAircraft: (
    aircraft: Aircraft,
    mode: "create" | "edit",
  ) => AircraftSaveResult;
  onDeleteAircraft: (id: string) => void;
};

export function AircraftSettingsTab({
  users,
  organizations,
  aircraft,
  aircraftIdsInFlight,
  onSaveAircraft,
  onDeleteAircraft,
}: AircraftSettingsTabProps) {
  const currentUser = useCurrentUser(users);
  const canEditEmergencyContact = currentUser
    ? canEditAircraftEmergencyContact(currentUser.role)
    : false;
  const [isAircraftModalOpen, setIsAircraftModalOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const [form, setForm] = useState<AircraftFormValues>(emptyAircraftForm());
  const [deleteTarget, setDeleteTarget] = useState<Aircraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAircraft = useMemo(
    () => filterAircraftRegistry(aircraft, searchQuery),
    [aircraft, searchQuery],
  );

  const modalMode = editingAircraft ? "edit" : "create";

  const inFlightIds = useMemo(
    () => aircraftIdsInFlight ?? new Set<string>(),
    [aircraftIdsInFlight],
  );

  const closeModal = () => {
    setIsAircraftModalOpen(false);
    setEditingAircraft(null);
  };

  const openCreate = () => {
    setEditingAircraft(null);
    setForm(emptyAircraftForm());
    setSaveError(null);
    setIsAircraftModalOpen(true);
  };

  const openEdit = (aircraftToEdit: Aircraft) => {
    setEditingAircraft(cloneAircraft(aircraftToEdit));
    setForm(configToForm(aircraftToEdit));
    setSaveError(null);
    setIsAircraftModalOpen(true);
  };

  const handleSave = () => {
    if (modalMode === "edit" && !editingAircraft) return;

    const id =
      modalMode === "edit" ? editingAircraft!.id : `ac-${Date.now()}`;
    const existingIds = new Set(aircraft.map((entry) => entry.id));
    const contactFields = {
      organizationId: form.organizationId,
      organizationName: form.organizationName.trim(),
      primaryContactName: form.primaryContactName.trim(),
      primaryContactPhone: form.primaryContactPhone,
      email: form.email.trim(),
      emergencyContactName: canEditEmergencyContact
        ? form.emergencyContactName.trim()
        : (editingAircraft?.emergencyContactName ??
          form.emergencyContactName.trim()),
      emergencyContactPhone: canEditEmergencyContact
        ? form.emergencyContactPhone
        : (editingAircraft?.emergencyContactPhone ?? form.emergencyContactPhone),
    };

    const prepared = prepareAircraftSave(
      {
        id,
        tailNumber: form.tailNumber.trim(),
        aircraftType: form.aircraftType.trim(),
        homeState: form.homeState,
        monitoringZone: form.monitoringZone,
        checkIntervalMinutes: form.checkIntervalMinutes,
        status: modalMode === "create" ? "Active" : form.status,
        ...contactFields,
      },
      modalMode,
      existingIds,
    );

    if (!prepared.ok) {
      setSaveError(prepared.message);
      return;
    }

    const result = onSaveAircraft(prepared.aircraft, modalMode);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }

    setSaveError(null);
    closeModal();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteAircraft(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Aircraft Registry</h2>
          <p className="text-sm text-slate-500">
            Manage fleet registry — add, edit, and delete aircraft.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
        >
          + Add Aircraft
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tail, organization, emergency contact…"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25"
          aria-label="Search aircraft registry"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold sm:px-6">Tail Number</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Aircraft Type</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Organization</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Emergency Contact</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Monitoring Zone</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Check Interval</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Status</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {aircraft.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No aircraft in the registry. Add one to get started.
                  </td>
                </tr>
              ) : null}
              {filteredAircraft.length === 0 && aircraft.length > 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No aircraft match your search.
                  </td>
                </tr>
              ) : null}
              {filteredAircraft.map((ac) => (
                <tr
                  key={ac.id}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                >
                  <td className="px-4 py-4 font-mono font-semibold text-cyan-300 sm:px-6">
                    {ac.tailNumber}
                  </td>
                  <td className="px-4 py-4 text-slate-300 sm:px-6">
                    {ac.aircraftType}
                  </td>
                  <td className="px-4 py-4 text-slate-400 sm:px-6">
                    {ac.organizationName?.trim() || (
                      <span className="text-xs italic text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-400 sm:px-6">
                    {ac.emergencyContactName?.trim() ? (
                      <div className="min-w-[10rem]">
                        <p className="text-slate-300">{ac.emergencyContactName}</p>
                        {ac.emergencyContactPhone ? (
                          <p className="mt-0.5 font-mono text-xs text-cyan-400/90">
                            {formatEmergencyPhoneDisplay(ac.emergencyContactPhone)}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs italic text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <ZoneBadge zone={ac.monitoringZone} />
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-300 sm:px-6">
                    {ac.checkIntervalMinutes} min
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <EntityStatusBadge status={ac.status} />
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton onClick={() => openEdit(ac)}>Edit</ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => setDeleteTarget(ac)}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AircraftFormModal
        isOpen={isAircraftModalOpen}
        mode={modalMode}
        values={form}
        saveError={saveError}
        organizations={organizations}
        canEditEmergencyContact={canEditEmergencyContact}
        onChange={(values) => {
          setSaveError(null);
          setForm(values);
        }}
        onSubmit={handleSave}
        onClose={closeModal}
      />

      <DeleteAircraftModal
        isOpen={deleteTarget !== null}
        tailNumber={deleteTarget?.tailNumber ?? ""}
        hasActiveFlight={
          deleteTarget !== null && inFlightIds.has(deleteTarget.id)
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  const styles =
    variant === "danger"
      ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
      : "border-slate-600 text-slate-300 hover:bg-slate-800";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${styles}`}
    >
      {children}
    </button>
  );
}
