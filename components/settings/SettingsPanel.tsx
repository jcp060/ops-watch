"use client";

import { useMemo, useState } from "react";
import {
  useAircraftStore,
  useActiveFlightsStore,
  useOcc,
  useOrganizationsStore,
  useUsersStore,
} from "@/context/OccContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canManageOrganizations } from "@/lib/access-control";
import { AircraftSettingsTab } from "@/components/settings/AircraftSettingsTab";
import { OrganizationsSettingsTab } from "@/components/settings/OrganizationsSettingsTab";
import { UsersSettingsTab } from "@/components/settings/UsersSettingsTab";
import type { SettingsTab } from "@/lib/types";

export function SettingsPanel() {
  const { now } = useOcc();
  const { users, saveUser, deleteUser } = useUsersStore();
  const { organizations, saveOrganization, deleteOrganization } =
    useOrganizationsStore();
  const { aircraftRegistry, saveAircraft, deleteAircraft } = useAircraftStore();
  const { activeFlightViews } = useActiveFlightsStore();
  const { aircraftIdsInFlight } = useActiveFlightsStore();
  const currentUser = useCurrentUser(users);
  const showOrganizations = currentUser
    ? canManageOrganizations(currentUser.role)
    : false;

  const [settingsTab, setSettingsTab] = useState<SettingsTab>("users");

  const subTabs = useMemo(() => {
    const tabs: { id: SettingsTab; label: string }[] = [
      { id: "users", label: "Users" },
      { id: "aircraft", label: "Aircraft" },
    ];
    if (showOrganizations) {
      tabs.push({ id: "organizations", label: "Organizations" });
    }
    return tabs;
  }, [showOrganizations]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
        <p className="text-sm text-slate-500">
          Configure users, organizations, and aircraft registry for the operations
          center.
        </p>
      </div>

      <nav
        className="mb-6 flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1"
        aria-label="Settings sections"
      >
        {subTabs.map((tab) => {
          const isSelected = settingsTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSettingsTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                isSelected
                  ? "bg-slate-700 text-cyan-300"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
              aria-current={isSelected ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {settingsTab === "users" ? (
        <UsersSettingsTab
          users={users}
          now={now}
          onSaveUser={saveUser}
          onDeleteUser={deleteUser}
        />
      ) : settingsTab === "organizations" && showOrganizations ? (
        <OrganizationsSettingsTab
          organizations={organizations}
          aircraft={aircraftRegistry}
          activeFlights={activeFlightViews}
          onSaveOrganization={saveOrganization}
          onDeleteOrganization={deleteOrganization}
          currentUser={currentUser}
        />
      ) : (
        <AircraftSettingsTab
          users={users}
          organizations={organizations}
          aircraft={aircraftRegistry}
          aircraftIdsInFlight={aircraftIdsInFlight}
          onSaveAircraft={saveAircraft}
          onDeleteAircraft={deleteAircraft}
        />
      )}
    </div>
  );
}
