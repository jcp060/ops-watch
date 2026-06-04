import { resolveActiveFlightView } from "@/lib/active-flights";
import {
  buildEmergencyIncidentDraft,
  isActiveEmergencyIncident,
  openEmergencyResponseTab,
} from "@/lib/emergency-workflow";
import { createVerificationRecord } from "@/lib/verification";
import {
  findActiveFlightById,
  getActiveFlightsSnapshot,
  linkEmergencyIncidentInStore,
} from "@/stores/active-flights-store";
import { getAircraftRegistrySnapshot } from "@/stores/aircraft-store";
import { getArchiveSnapshot } from "@/stores/archive-store";
import {
  verifyFlightInFleet,
  type FleetStoresSnapshot,
} from "@/stores/fleet-actions";
import {
  deleteIncidentReportInStore,
  getIncidentReportsSnapshot,
  persistIncidentReportsNow,
  saveIncidentReportInStore,
} from "@/stores/incident-reports-store";
import { persistResponsePlansNow } from "@/stores/response-plans-store";
import type { ActiveFlight, Aircraft, IncidentReport, OccUser } from "@/lib/types";

const LOG_PREFIX = "[Emergency workflow]";

export type EmergencyDeclarationResult =
  | {
      ok: true;
      incidentId: string;
      reportNumber: string;
      tabOpened: boolean;
      tabError?: string;
    }
  | { ok: false; step: string; message: string };

function logStep(step: string, detail?: string): void {
  console.log(detail ? `${LOG_PREFIX} ${step}: ${detail}` : `${LOG_PREFIX} ${step}`);
}

function logFailure(step: string, message: string): void {
  console.error(`${LOG_PREFIX} ${step} FAILED: ${message}`);
}

function getFleetSnapshot(): FleetStoresSnapshot {
  return {
    aircraftRegistry: getAircraftRegistrySnapshot(),
    activeFlights: getActiveFlightsSnapshot(),
    archivedFlights: getArchiveSnapshot(),
  };
}

function persistEmergencyStores(): void {
  persistIncidentReportsNow();
  persistResponsePlansNow();
}

export type DeclareEmergencyInput = {
  flightId: string;
  aircraft: Aircraft;
  user: Pick<OccUser, "id" | "name">;
  notes: string;
  verifiedAt: number;
  openTab?: boolean;
};

export function declareEmergencyForActiveFlight(
  input: DeclareEmergencyInput,
): EmergencyDeclarationResult {
  const { flightId, aircraft, user, notes, verifiedAt, openTab = true } = input;

  logStep("STEP 1", "Emergency button clicked");

  const sessions = getActiveFlightsSnapshot();
  const session = findActiveFlightById(sessions, flightId);
  if (!session) {
    logFailure("STEP 2", "Active flight session not found");
    return {
      ok: false,
      step: "STEP 2",
      message: "Active flight not found. Refresh the dashboard and try again.",
    };
  }

  const flightView = resolveActiveFlightView(session, getAircraftRegistrySnapshot());
  if (!flightView) {
    logFailure("STEP 2", "Unable to resolve aircraft for active flight");
    return {
      ok: false,
      step: "STEP 2",
      message: "Aircraft record not found for this flight.",
    };
  }

  const existingReports = getIncidentReportsSnapshot();
  const existingId = session.incidentReportId;
  if (existingId) {
    const existing = existingReports.find((report) => report.id === existingId);
    if (existing && isActiveEmergencyIncident(existing)) {
      logStep("STEP 3", `Reusing active incident ${existing.reportNumber}`);
      const linked = applyEmergencyVerification(
        flightId,
        user,
        notes,
        verifiedAt,
        existing.id,
      );
      if (!linked.ok) return linked;

      let tabOpened = false;
      let tabError: string | undefined;
      if (openTab) {
        const tabResult = openEmergencyResponseTab(existing.id);
        tabOpened = tabResult.opened;
        tabError = tabResult.error;
        if (tabOpened) {
          logStep("STEP 7", `Opened incident tab for ${existing.id}`);
        } else if (tabResult.error) {
          logFailure("STEP 7", tabResult.error);
        }
      }

      return {
        ok: true,
        incidentId: existing.id,
        reportNumber: existing.reportNumber,
        tabOpened,
        tabError,
      };
    }
  }

  let draft: IncidentReport;
  try {
    logStep("STEP 3", "Creating incident record");
    draft = buildEmergencyIncidentDraft({
      flight: flightView,
      aircraft,
      user,
      checkInNotes: notes,
      verifiedAt,
      existingReports,
    });
    logStep("STEP 4", `Incident ID generated: ${draft.id}`);
    logStep(
      "STEP 5",
      `Response plan loaded: ${draft.responsePlanExecution?.planName ?? "unknown"} v${draft.responsePlanExecution?.versionNumber ?? "?"}`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load organization response plan.";
    logFailure("STEP 5", message);
    return { ok: false, step: "STEP 5", message };
  }

  const saved = saveIncidentReportInStore(draft, "create");
  if (!saved.ok) {
    logFailure("STEP 6", saved.message);
    return { ok: false, step: "STEP 6", message: saved.message };
  }

  logStep("STEP 6", `Incident saved: ${saved.report.reportNumber}`);
  persistEmergencyStores();

  const verified = applyEmergencyVerification(
    flightId,
    user,
    notes,
    verifiedAt,
    saved.report.id,
  );
  if (!verified.ok) {
    deleteIncidentReportInStore(saved.report.id);
    persistEmergencyStores();
    return verified;
  }

  let tabOpened = false;
  let tabError: string | undefined;
  if (openTab) {
    logStep("STEP 7", `Opening incident tab for ${saved.report.id}`);
    const tabResult = openEmergencyResponseTab(saved.report.id);
    tabOpened = tabResult.opened;
    tabError = tabResult.error;
    if (tabOpened) {
      logStep("STEP 7", `Opened ${tabResult.path ?? saved.report.id}`);
    } else if (tabResult.error) {
      logFailure("STEP 7", tabResult.error);
    }
  }

  return {
    ok: true,
    incidentId: saved.report.id,
    reportNumber: saved.report.reportNumber,
    tabOpened,
    tabError,
  };
}

function applyEmergencyVerification(
  flightId: string,
  user: Pick<OccUser, "id" | "name">,
  notes: string,
  verifiedAt: number,
  incidentReportId: string,
):
  | { ok: true }
  | { ok: false; step: string; message: string } {
  const record = createVerificationRecord(
    user.id,
    user.name,
    "Emergency",
    notes,
    verifiedAt,
  );

  const fleetResult = verifyFlightInFleet(
    getFleetSnapshot(),
    flightId,
    "Emergency",
    notes,
    verifiedAt,
    record,
  );

  if (!fleetResult) {
    logFailure("STEP 2", "Unable to update aircraft verification status");
    return {
      ok: false,
      step: "STEP 2",
      message: "Unable to update aircraft status to Emergency.",
    };
  }

  linkEmergencyIncidentInStore(
    getActiveFlightsSnapshot(),
    flightId,
    verifiedAt,
    incidentReportId,
  );

  logStep("STEP 2", "Aircraft status updated to Emergency");
  persistEmergencyStores();
  return { ok: true };
}
