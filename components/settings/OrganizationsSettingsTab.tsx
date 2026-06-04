"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { OrganizationHubModal } from "@/components/settings/OrganizationHubModal";
import {
  OrganizationFormModal,
  emptyOrganizationForm,
  organizationToForm,
  type OrganizationFormValues,
} from "@/components/settings/OrganizationFormModal";
import {
  buildOrganizationFleetStats,
  countAircraftForOrganization,
} from "@/lib/organization-aircraft";
import { filterOrganizations } from "@/lib/organization-search";
import { prepareOrganizationSave } from "@/lib/organization-save";
import type { OrganizationSaveResult } from "@/lib/organization-save";
import { createUniqueId } from "@/lib/unique-id";
import type { Aircraft, ActiveFlight, OccUser, Organization } from "@/lib/types";

type OrganizationsSettingsTabProps = {
  organizations: Organization[];
  aircraft: Aircraft[];
  activeFlights: ActiveFlight[];
  onSaveOrganization: (
    organization: Organization,
    mode: "create" | "edit",
  ) => OrganizationSaveResult;
  onDeleteOrganization: (id: string) => boolean;
  currentUser: OccUser | null;
};

export function OrganizationsSettingsTab({
  organizations,
  aircraft,
  activeFlights,
  onSaveOrganization,
  onDeleteOrganization,
  currentUser,
}: OrganizationsSettingsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OrganizationFormValues>(emptyOrganizationForm());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailOrg, setDetailOrg] = useState<Organization | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterOrganizations(organizations, searchQuery),
    [organizations, searchQuery],
  );

  const detailStats = useMemo(
    () =>
      detailOrg
        ? buildOrganizationFleetStats(detailOrg.id, aircraft, activeFlights)
        : null,
    [detailOrg, aircraft, activeFlights],
  );

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyOrganizationForm());
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (org: Organization) => {
    setModalMode("edit");
    setEditingId(org.id);
    setForm(organizationToForm(org));
    setSaveError(null);
    setModalOpen(true);
  };

  const handleSave = () => {
    const id = editingId ?? `org-${createUniqueId()}`;
    const draft: Organization = {
      id,
      ...form,
      createdAt:
        modalMode === "edit"
          ? organizations.find((o) => o.id === id)?.createdAt ?? Date.now()
          : Date.now(),
    };

    const prepared = prepareOrganizationSave(draft, modalMode, organizations);
    if (!prepared.ok) {
      setSaveError(prepared.message);
      return;
    }

    const result = onSaveOrganization(prepared.organization, modalMode);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }

    setSaveError(null);
    setModalOpen(false);
  };

  const handleDelete = (org: Organization) => {
    setDeleteError(null);
    const assigned = countAircraftForOrganization(aircraft, org.id);
    if (assigned > 0) {
      setDeleteError(
        `Cannot delete "${org.organizationName}" — ${assigned} aircraft still assigned. Reassign or remove aircraft first.`,
      );
      return;
    }
    if (!window.confirm(`Delete organization "${org.organizationName}"?`)) return;
    onDeleteOrganization(org.id);
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Organizations</h2>
          <p className="text-sm text-slate-500">
            Parent operators — aircraft inherit contacts when assigned.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          + Create Organization
        </button>
      </div>

      {deleteError ? (
        <p
          className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {deleteError}
        </p>
      ) : null}

      <div className="relative mb-4 max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, contact, email…"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold sm:px-6">Organization</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Primary contact</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Aircraft</th>
                <th className="px-4 py-3 font-semibold sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    {organizations.length === 0
                      ? "No organizations yet. Create one to assign aircraft."
                      : "No organizations match your search."}
                  </td>
                </tr>
              ) : null}
              {filtered.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                >
                  <td className="px-4 py-4 font-medium text-slate-100 sm:px-6">
                    {org.organizationName}
                  </td>
                  <td className="px-4 py-4 text-slate-400 sm:px-6">
                    {org.primaryContactName || "—"}
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-300 sm:px-6">
                    {countAircraftForOrganization(aircraft, org.id)}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton onClick={() => setDetailOrg(org)}>
                        View
                      </ActionButton>
                      <ActionButton onClick={() => openEdit(org)}>Edit</ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => handleDelete(org)}
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

      <OrganizationFormModal
        isOpen={modalOpen}
        mode={modalMode}
        values={form}
        saveError={saveError}
        onChange={(values) => {
          setSaveError(null);
          setForm(values);
        }}
        onSubmit={handleSave}
        onClose={() => setModalOpen(false)}
      />

      <OrganizationHubModal
        organization={detailOrg}
        fleetStats={detailStats}
        currentUser={currentUser}
        onClose={() => setDetailOrg(null)}
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
