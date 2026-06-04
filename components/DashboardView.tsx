"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useActiveFlightsStore,
  useOcc,
} from "@/context/OccContext";
import { getAircraftStatus } from "@/lib/aircraft-status";
import { isFlightInEmergency, openEmergencyResponseTab } from "@/lib/emergency-workflow";
import { filterByZone } from "@/lib/monitoring-zones";
import type { VerificationOutcome, ZoneFilter } from "@/lib/types";
import { ActiveFlightsPanel } from "@/components/ActiveFlightsPanel";
import { AircraftDetailModal } from "@/components/AircraftDetailModal";
import { EmergencyCreatedNotice } from "@/components/EmergencyCreatedNotice";
import { StartFlightModal } from "@/components/StartFlightModal";

export function DashboardView() {
  const { now } = useOcc();
  const {
    activeFlights: activeFlightSessions,
    activeFlightViews,
    startFlight,
    submitVerification,
  } = useActiveFlightsStore();

  const [detailFlightId, setDetailFlightId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<VerificationOutcome>("Airborne");
  const [notes, setNotes] = useState("");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [startFlightOpen, setStartFlightOpen] = useState(false);
  const [emergencyNoticeNumber, setEmergencyNoticeNumber] = useState<
    string | null
  >(null);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);

  const filteredActiveFlights = useMemo(
    () => filterByZone(activeFlightViews, zoneFilter),
    [activeFlightViews, zoneFilter],
  );

  const isDetailOpen =
    detailFlightId !== null &&
    activeFlightSessions.some((f) => f.id === detailFlightId);

  useEffect(() => {
    if (
      detailFlightId !== null &&
      !activeFlightSessions.some((f) => f.id === detailFlightId)
    ) {
      setDetailFlightId(null);
      setNotes("");
    }
  }, [activeFlightSessions, detailFlightId]);

  const openDetail = useCallback((flightId: string) => {
    setDetailFlightId(flightId);
    setOutcome("Airborne");
    setNotes("");
  }, []);

  const closeDetail = useCallback(() => {
    setDetailFlightId(null);
    setNotes("");
  }, []);

  const handleEmergency = useCallback(() => {
    if (!detailFlightId) return;
    setEmergencyError(null);

    const result = submitVerification(detailFlightId, "Emergency", notes);
    if (!result.ok) {
      setEmergencyError(
        result.message ?? "Unable to create emergency incident record",
      );
      return;
    }

    if (!result.emergencyIncidentId) {
      setEmergencyError("Emergency incident was not created.");
      return;
    }

    const tabResult = openEmergencyResponseTab(result.emergencyIncidentId);
    if (!tabResult.opened) {
      setEmergencyError(
        tabResult.error ??
          "Emergency incident was saved, but the response tab could not be opened.",
      );
      setEmergencyNoticeNumber(result.reportNumber ?? null);
      return;
    }

    setEmergencyNoticeNumber(result.reportNumber ?? null);
    closeDetail();
  }, [detailFlightId, notes, submitVerification, closeDetail]);

  const handleVerify = useCallback(() => {
    if (!detailFlightId) return;
    if (outcome === "Emergency") {
      handleEmergency();
      return;
    }
    setEmergencyError(null);
    submitVerification(detailFlightId, outcome, notes);
    closeDetail();
  }, [detailFlightId, outcome, notes, submitVerification, closeDetail, handleEmergency]);

  const handleLandedSafely = useCallback(() => {
    if (!detailFlightId) return;
    submitVerification(detailFlightId, "Landed Safely", notes);
    closeDetail();
  }, [detailFlightId, notes, submitVerification, closeDetail]);

  const handleStartFlight = useCallback(
    (aircraftId: string) => {
      if (startFlight(aircraftId)) {
        setStartFlightOpen(false);
      }
    },
    [startFlight],
  );

  return (
    <>
      <ActiveFlightsPanel
        flights={filteredActiveFlights}
        now={now}
        zoneFilter={zoneFilter}
        onZoneFilterChange={setZoneFilter}
        onOpenStartFlight={() => setStartFlightOpen(true)}
        onSelectFlight={openDetail}
      />

      <StartFlightModal
        isOpen={startFlightOpen}
        onSelectAircraft={handleStartFlight}
        onClose={() => setStartFlightOpen(false)}
      />

      <AircraftDetailModal
        flightId={detailFlightId}
        isOpen={isDetailOpen}
        now={now}
        outcome={outcome}
        notes={notes}
        onOutcomeChange={setOutcome}
        onNotesChange={setNotes}
        onVerify={handleVerify}
        onEmergency={handleEmergency}
        onLandedSafely={handleLandedSafely}
        onClose={closeDetail}
      />

      <EmergencyCreatedNotice
        reportNumber={emergencyNoticeNumber}
        onDismiss={() => setEmergencyNoticeNumber(null)}
      />

      {emergencyError ? (
        <div
          className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-xl border border-red-500/50 bg-slate-900 px-4 py-3 shadow-2xl"
          role="alert"
        >
          <p className="font-semibold text-red-200">Emergency not recorded</p>
          <p className="mt-1 text-sm text-slate-300">{emergencyError}</p>
          <button
            type="button"
            onClick={() => setEmergencyError(null)}
            className="mt-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}

export function DashboardStatusCards() {
  const { now } = useOcc();
  const { activeFlightViews } = useActiveFlightsStore();
  const [zoneFilter] = useState<ZoneFilter>("all");

  const filteredActiveFlights = useMemo(
    () => filterByZone(activeFlightViews, zoneFilter),
    [activeFlightViews, zoneFilter],
  );

  const statusCounts = useMemo(() => {
    const counts = { ACTIVE: 0, WARNING: 0, OVERDUE: 0, EMERGENCY: 0 };
    for (const flight of filteredActiveFlights) {
      if (isFlightInEmergency(flight)) {
        counts.EMERGENCY += 1;
        continue;
      }
      counts[getAircraftStatus(flight.dueAt, now)] += 1;
    }
    return counts;
  }, [filteredActiveFlights, now]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-2xl">
      <StatCard
        label="Active"
        value={statusCounts.ACTIVE}
        accent="text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
      />
      <StatCard
        label="Warning"
        value={statusCounts.WARNING}
        accent="text-amber-400 border-amber-500/20 bg-amber-500/5"
      />
      <StatCard
        label="Overdue"
        value={statusCounts.OVERDUE}
        accent="text-red-400 border-red-500/20 bg-red-500/5"
      />
      <StatCard
        label="Emergency"
        value={statusCounts.EMERGENCY}
        accent="text-red-300 border-red-500/30 bg-red-500/10"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${accent}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
