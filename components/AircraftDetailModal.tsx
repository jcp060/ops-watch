"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import {
  useAircraftStore,
  useActiveFlightsStore,
} from "@/context/OccContext";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { resolveActiveFlightView } from "@/lib/active-flights";
import {
  formatCountdown,
  formatLastVerified,
  getAircraftStatus,
} from "@/lib/aircraft-status";
import { formatDateTime } from "@/lib/format";
import { formatEmergencyPhoneDisplay } from "@/lib/emergency-contact";
import type { ActiveFlight, VerificationOutcome } from "@/lib/types";
import { VERIFICATION_OUTCOMES } from "@/lib/types";
import { EmergencyContactDisplay } from "@/components/aircraft/EmergencyContactDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import { ZoneBadge } from "@/components/ZoneBadge";

const TIMER_COLOR = {
  ACTIVE: "text-emerald-300",
  WARNING: "text-amber-300",
  OVERDUE: "text-red-400",
} as const;

type AircraftDetailModalProps = {
  flightId: string | null;
  isOpen: boolean;
  now: number;
  outcome: VerificationOutcome;
  notes: string;
  onOutcomeChange: (outcome: VerificationOutcome) => void;
  onNotesChange: (notes: string) => void;
  onVerify: () => void;
  onEmergency: () => void;
  onLandedSafely: () => void;
  onClose: () => void;
};

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-200">{children}</dd>
    </div>
  );
}

export function AircraftDetailModal({
  flightId,
  isOpen,
  now,
  outcome,
  notes,
  onOutcomeChange,
  onNotesChange,
  onVerify,
  onEmergency,
  onLandedSafely,
  onClose,
}: AircraftDetailModalProps) {
  const { activeFlights } = useActiveFlightsStore();
  const { aircraftRegistry } = useAircraftStore();
  const titleId = useId();
  const [pendingConfirm, setPendingConfirm] = useState<
    "verify" | "landed" | "emergency" | null
  >(null);

  const flight = useMemo(() => {
    if (!flightId) return null;
    const session = activeFlights.find((f) => f.id === flightId);
    if (!session) return null;
    return resolveActiveFlightView(session, aircraftRegistry);
  }, [flightId, activeFlights, aircraftRegistry]);

  useEffect(() => {
    if (!isOpen) setPendingConfirm(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pendingConfirm) {
        setPendingConfirm(null);
        return;
      }
      onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, pendingConfirm]);

  if (!isOpen || !flight) return null;

  const status = getAircraftStatus(flight.dueAt, now);
  const countdown = formatCountdown(flight.dueAt, now);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={pendingConfirm ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate font-mono text-2xl font-bold tracking-tight text-cyan-300"
            >
              {flight.tailNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{flight.aircraftType}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (pendingConfirm) setPendingConfirm(null);
              else onClose();
            }}
            className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            aria-label="Close aircraft details"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <DetailField label="Organization">
              {flight.organizationName?.trim() || "—"}
            </DetailField>
            <DetailField label="Aircraft type">{flight.aircraftType}</DetailField>
            <DetailField label="Monitoring zone">
              <ZoneBadge zone={flight.monitoringZone} />
            </DetailField>
          </dl>

          {flight.primaryContactName?.trim() ||
          flight.primaryContactPhone ||
          flight.email ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Primary contact
              </p>
              <p className="mt-1 text-slate-200">{flight.primaryContactName || "—"}</p>
              {flight.primaryContactPhone ? (
                <p className="mt-0.5 font-mono text-cyan-300/90">
                  {flight.primaryContactPhone}
                </p>
              ) : null}
              {flight.email ? (
                <p className="mt-1.5 text-slate-300">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Primary contact email
                  </span>
                  <span className="mt-0.5 block">{flight.email}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <EmergencyContactDisplay
            name={flight.emergencyContactName}
            phone={flight.emergencyContactPhone}
          />

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge status={status} />
              <span
                className={`font-mono text-4xl font-bold tabular-nums tracking-wide ${TIMER_COLOR[status]}`}
                aria-live="polite"
                aria-atomic
              >
                {countdown}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-slate-800/80 pt-4 sm:grid-cols-2">
              <DetailField label="Last check-in">
                <span className="block">{formatDateTime(flight.lastVerifiedAt)}</span>
                <span className="text-xs text-slate-500">
                  {formatLastVerified(flight.lastVerifiedAt, now)}
                </span>
              </DetailField>
              <DetailField label="Next check-in due">
                <span className="block">{formatDateTime(flight.dueAt)}</span>
                <span className="text-xs text-slate-500">
                  {status === "OVERDUE" ? "Past due" : `${countdown} remaining`}
                </span>
              </DetailField>
            </dl>
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-1">
            <label
              htmlFor="detail-verification-outcome"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Verification outcome
            </label>
            <select
              id="detail-verification-outcome"
              value={outcome}
              onChange={(event) =>
                onOutcomeChange(event.target.value as VerificationOutcome)
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
            >
              {VERIFICATION_OUTCOMES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {outcome === "Emergency" ? (
              <p className="text-xs text-red-300/90">
                Use the Emergency button below to declare an incident and open the
                response workflow.
              </p>
            ) : null}

            <label
              htmlFor="detail-verification-notes"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Notes
            </label>
            <textarea
              id="detail-verification-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={2}
              placeholder="Operational notes (optional)"
              className="w-full resize-y rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setPendingConfirm("emergency")}
            className="rounded-lg border border-red-500/50 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          >
            Emergency
          </button>
          <button
            type="button"
            onClick={() => setPendingConfirm("landed")}
            className="rounded-lg border border-emerald-600/50 bg-emerald-600/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-600/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            Landed Safely
          </button>
          <button
            type="button"
            onClick={() => setPendingConfirm("verify")}
            className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            Verify
          </button>
        </div>
      </div>

      <ConfirmActionDialog
        isOpen={pendingConfirm === "emergency"}
        message="Declare an EMERGENCY for this aircraft? An incident record will be created and the response workflow will open in a new tab."
        confirmLabel="Declare Emergency"
        confirmTone="cyan"
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          setPendingConfirm(null);
          onOutcomeChange("Emergency");
          onEmergency();
        }}
      />
      <ConfirmActionDialog
        isOpen={pendingConfirm === "verify"}
        message="Are you sure you want to verify this aircraft?"
        confirmLabel="Confirm Verify"
        confirmTone="cyan"
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          setPendingConfirm(null);
          onVerify();
        }}
      />
      <ConfirmActionDialog
        isOpen={pendingConfirm === "landed"}
        message="Mark this aircraft as LANDED? This will move it to archived flights."
        confirmLabel="Confirm Landed"
        confirmTone="emerald"
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          setPendingConfirm(null);
          onLandedSafely();
        }}
      />
    </div>
  );
}
