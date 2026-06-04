"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { resolveActiveFlightView, resolveActiveFlightViews } from "@/lib/active-flights";
import type {
  ActiveFlight,
  ActiveFlightSession,
  Aircraft,
  ArchivedFlight,
  OccUser,
  IncidentReport,
  Organization,
  VerificationOutcome,
} from "@/lib/types";
import {
  SYSTEM_OPERATOR_DISPLAY_NAME,
  SYSTEM_OPERATOR_USER_ID,
} from "@/lib/occ-operator";
import { declareEmergencyForActiveFlight } from "@/lib/emergency-declaration";
import { useActiveFlights } from "@/hooks/use-active-flights";
import { useAircraftRegistry } from "@/hooks/use-aircraft-registry";
import { useOrganizationsRegistry } from "@/hooks/use-organizations-registry";
import { useArchive } from "@/hooks/use-archive";
import { useIncidentReportsRegistry } from "@/hooks/use-incident-reports";
import { useUsersRegistry } from "@/hooks/use-users-registry";
import type { AircraftSaveResult } from "@/lib/aircraft-save";
import {
  deleteAircraftInStore,
  getAircraftRegistrySnapshot,
  saveAircraftInStore,
} from "@/stores/aircraft-store";
import { createVerificationRecord } from "@/lib/verification";
import {
  findActiveFlightById,
  getActiveFlightsSnapshot,
  startFlightInStore,
} from "@/stores/active-flights-store";
import {
  deleteArchivedFlightInStore,
  getArchiveSnapshot,
  type ArchiveDeleteResult,
} from "@/stores/archive-store";
import { requestArchivedFlightDeletion } from "@/lib/archive-api";
import {
  ArchiveRetentionError,
  getArchivedAt,
} from "@/lib/archive-retention";
import {
  verifyFlightInFleet,
  type FleetStoresSnapshot,
} from "@/stores/fleet-actions";
import {
  deleteOrganizationInStore,
  saveOrganizationInStore,
} from "@/stores/organizations-store";
import {
  deleteUserInStore,
  findUserById,
  saveUserInStore,
} from "@/stores/users-store";
import type { OrganizationSaveResult } from "@/lib/organization-save";
import type { IncidentReportSaveResult } from "@/lib/incident-report-save";
import {
  deleteIncidentReportInStore,
  saveIncidentReportInStore,
} from "@/stores/incident-reports-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { setCurrentUserId as persistCurrentUserId } from "@/stores/session-store";

type AircraftStoreValue = {
  aircraftRegistry: Aircraft[];
  saveAircraft: (
    aircraft: Aircraft,
    mode: "create" | "edit",
  ) => AircraftSaveResult;
  deleteAircraft: (id: string) => boolean;
};

type VerificationSubmitResult =
  | {
      ok: true;
      emergencyIncidentId?: string;
      reportNumber?: string;
      tabOpened?: boolean;
      tabError?: string;
    }
  | { ok: false; message?: string };

type ActiveFlightsStoreValue = {
  activeFlights: ActiveFlightSession[];
  /** Dashboard read-model: sessions joined with live aircraft registry. */
  activeFlightViews: ActiveFlight[];
  aircraftIdsInFlight: Set<string>;
  startFlight: (aircraftId: string) => ActiveFlightSession | null;
  submitVerification: (
    flightId: string,
    outcome: VerificationOutcome,
    notes: string,
  ) => VerificationSubmitResult;
};

type ArchiveStoreValue = {
  archivedFlights: ArchivedFlight[];
  deleteArchivedFlight: (id: string) => Promise<ArchiveDeleteResult>;
};

type UsersStoreValue = {
  users: OccUser[];
  saveUser: (user: OccUser, mode: "create" | "edit") => void;
  deleteUser: (id: string) => void;
};

type OrganizationsStoreValue = {
  organizations: Organization[];
  saveOrganization: (
    organization: Organization,
    mode: "create" | "edit",
  ) => OrganizationSaveResult;
  deleteOrganization: (id: string) => boolean;
};

type IncidentReportsStoreValue = {
  incidentReports: IncidentReport[];
  saveIncidentReport: (
    report: IncidentReport,
    mode: "create" | "edit",
  ) => IncidentReportSaveResult;
  deleteIncidentReport: (id: string) => boolean;
};

type SessionValue = {
  currentUser: OccUser | null;
  setCurrentUserId: (userId: string) => void;
};

type OccContextValue = {
  now: number;
  session: SessionValue;
  users: UsersStoreValue;
  organizations: OrganizationsStoreValue;
  aircraft: AircraftStoreValue;
  activeFlights: ActiveFlightsStoreValue;
  archive: ArchiveStoreValue;
  incidentReports: IncidentReportsStoreValue;
};

const OccContext = createContext<OccContextValue | null>(null);

function getFleetSnapshot(
  aircraftRegistry: Aircraft[],
  activeFlightSessions: ActiveFlightSession[],
  archivedFlights: ArchivedFlight[],
): FleetStoresSnapshot {
  return { aircraftRegistry, activeFlights: activeFlightSessions, archivedFlights };
}

export function OccProvider({ children }: { children: ReactNode }) {
  const users = useUsersRegistry();
  const organizations = useOrganizationsRegistry();
  const currentUser = useCurrentUser(users);
  const aircraftRegistry = useAircraftRegistry();
  const activeFlightSessions = useActiveFlights();
  const archivedFlights = useArchive();
  const incidentReports = useIncidentReportsRegistry();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeFlightViews = useMemo(
    () => resolveActiveFlightViews(activeFlightSessions, aircraftRegistry),
    [activeFlightSessions, aircraftRegistry],
  );

  const aircraftIdsInFlight = useMemo(
    () => new Set(activeFlightSessions.map((f) => f.aircraftId)),
    [activeFlightSessions],
  );

  const saveUser = useCallback((user: OccUser, mode: "create" | "edit") => {
    saveUserInStore(user, mode);
  }, []);

  const deleteUser = useCallback((id: string) => {
    deleteUserInStore(id);
  }, []);

  const saveAircraft = useCallback(
    (aircraft: Aircraft, mode: "create" | "edit") =>
      saveAircraftInStore(aircraft, mode),
    [],
  );

  const deleteAircraft = useCallback(
    (id: string) => deleteAircraftInStore(id),
    [],
  );

  const saveOrganization = useCallback(
    (organization: Organization, mode: "create" | "edit") =>
      saveOrganizationInStore(organization, mode),
    [],
  );

  const deleteOrganization = useCallback(
    (id: string) => deleteOrganizationInStore(id),
    [],
  );

  const saveIncidentReport = useCallback(
    (report: IncidentReport, mode: "create" | "edit") =>
      saveIncidentReportInStore(report, mode),
    [],
  );

  const deleteIncidentReport = useCallback(
    (id: string) => deleteIncidentReportInStore(id),
    [],
  );

  const deleteArchivedFlight = useCallback(
    async (id: string): Promise<ArchiveDeleteResult> => {
      const flight = getArchiveSnapshot().find((entry) => entry.id === id);
      if (!flight) {
        return { ok: false, reason: "not_found" };
      }

      const archivedAt = getArchivedAt(flight);

      try {
        await requestArchivedFlightDeletion(id, archivedAt);
      } catch (error) {
        if (error instanceof ArchiveRetentionError) {
          return {
            ok: false,
            reason: "retention_locked",
            unlockAt: error.unlockAt,
            message: error.message,
          };
        }
        throw error;
      }

      return deleteArchivedFlightInStore(id);
    },
    [],
  );

  const startFlight = useCallback((aircraftId: string): ActiveFlightSession | null => {
    const aircraft = getAircraftRegistrySnapshot().find((a) => a.id === aircraftId);
    if (!aircraft) return null;

    const result = startFlightInStore(getActiveFlightsSnapshot(), aircraft);
    if (!result) return null;

    setNow(result.session.flightStartTime);
    return result.session;
  }, []);

  const setCurrentUserId = useCallback(
    (userId: string) => {
      const user = users.find((entry) => entry.id === userId);
      if (user) {
        persistCurrentUserId(userId, user.role);
      }
    },
    [users],
  );

  useEffect(() => {
    if (currentUser) {
      persistCurrentUserId(currentUser.id, currentUser.role);
    }
  }, [currentUser?.id, currentUser?.role]);

  const submitVerification = useCallback(
    (flightId: string, outcome: VerificationOutcome, notes: string): VerificationSubmitResult => {
      const verifiedAt = Date.now();
      const actingUser = currentUser ?? findUserById(SYSTEM_OPERATOR_USER_ID);
      const userId = actingUser?.id ?? SYSTEM_OPERATOR_USER_ID;
      const userName = actingUser?.name ?? SYSTEM_OPERATOR_DISPLAY_NAME;

      const registry = getAircraftRegistrySnapshot();
      const sessions = getActiveFlightsSnapshot();
      const session = findActiveFlightById(sessions, flightId);
      if (!session) {
        return { ok: false, message: "Active flight not found." };
      }

      const aircraft = registry.find((a) => a.id === session.aircraftId);
      const flightView = resolveActiveFlightView(session, registry);
      if (!aircraft || !flightView) {
        return { ok: false, message: "Aircraft record not found for this flight." };
      }

      if (outcome === "Emergency") {
        const result = declareEmergencyForActiveFlight({
          flightId,
          aircraft,
          user: { id: userId, name: userName },
          notes,
          verifiedAt,
          openTab: false,
        });

        if (!result.ok) {
          return { ok: false, message: `${result.step}: ${result.message}` };
        }

        setNow(verifiedAt);
        return {
          ok: true,
          emergencyIncidentId: result.incidentId,
          reportNumber: result.reportNumber,
          tabOpened: result.tabOpened,
          tabError: result.tabError,
        };
      }

      const record = createVerificationRecord(
        userId,
        userName,
        outcome,
        notes,
        verifiedAt,
      );

      const next = verifyFlightInFleet(
        getFleetSnapshot(registry, sessions, getArchiveSnapshot()),
        flightId,
        outcome,
        notes,
        verifiedAt,
        record,
      );

      if (!next) {
        return { ok: false, message: "Unable to record verification." };
      }

      setNow(verifiedAt);
      return { ok: true };
    },
    [currentUser],
  );

  const value = useMemo<OccContextValue>(
    () => ({
      now,
      session: {
        currentUser,
        setCurrentUserId,
      },
      users: {
        users,
        saveUser,
        deleteUser,
      },
      organizations: {
        organizations,
        saveOrganization,
        deleteOrganization,
      },
      aircraft: {
        aircraftRegistry,
        saveAircraft,
        deleteAircraft,
      },
      activeFlights: {
        activeFlights: activeFlightSessions,
        activeFlightViews,
        aircraftIdsInFlight,
        startFlight,
        submitVerification,
      },
      archive: {
        archivedFlights,
        deleteArchivedFlight,
      },
      incidentReports: {
        incidentReports,
        saveIncidentReport,
        deleteIncidentReport,
      },
    }),
    [
      now,
      currentUser,
      setCurrentUserId,
      users,
      saveUser,
      deleteUser,
      organizations,
      saveOrganization,
      deleteOrganization,
      aircraftRegistry,
      saveAircraft,
      deleteAircraft,
      activeFlightSessions,
      activeFlightViews,
      aircraftIdsInFlight,
      startFlight,
      submitVerification,
      archivedFlights,
      deleteArchivedFlight,
      incidentReports,
      saveIncidentReport,
      deleteIncidentReport,
    ],
  );

  return <OccContext.Provider value={value}>{children}</OccContext.Provider>;
}

export function useOcc(): OccContextValue {
  const context = useContext(OccContext);
  if (!context) {
    throw new Error("useOcc must be used within OccProvider");
  }
  return context;
}

export function useAircraftStore(): AircraftStoreValue {
  return useOcc().aircraft;
}

export function useActiveFlightsStore(): ActiveFlightsStoreValue {
  return useOcc().activeFlights;
}

export function useArchiveStore(): ArchiveStoreValue {
  return useOcc().archive;
}

export function useUsersStore(): UsersStoreValue {
  return useOcc().users;
}

export function useOrganizationsStore(): OrganizationsStoreValue {
  return useOcc().organizations;
}

export function useIncidentReportsStore(): IncidentReportsStoreValue {
  return useOcc().incidentReports;
}
