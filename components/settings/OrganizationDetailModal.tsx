"use client";

import { X, Building2 } from "lucide-react";
import { EmergencyContactDisplay } from "@/components/aircraft/EmergencyContactDisplay";
import { ZoneBadge } from "@/components/ZoneBadge";
import { formatEmergencyPhoneDisplay } from "@/lib/emergency-contact";
import type { OrganizationFleetStats } from "@/lib/organization-aircraft";
import type { Organization } from "@/lib/types";

type OrganizationDetailModalProps = {
  organization: Organization | null;
  fleetStats: OrganizationFleetStats | null;
  onClose: () => void;
};

export function OrganizationDetailModal({
  organization,
  fleetStats,
  onClose,
}: OrganizationDetailModalProps) {
  if (!organization || !fleetStats) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl border border-violet-500/25 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
              <Building2 className="size-3.5" aria-hidden />
              Organization
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-50">
              {organization.organizationName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="max-h-[calc(90vh-4rem)] space-y-5 overflow-y-auto px-5 py-5">
          <dl className="grid grid-cols-2 gap-3">
            <Metric label="Fleet aircraft" value={fleetStats.totalAircraft} />
            <Metric label="Active in flight" value={fleetStats.activeInFlight} tone="cyan" />
          </dl>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Regional breakdown
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["East", "Central", "West"] as const).map((zone) => (
                <div
                  key={zone}
                  className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                >
                  <ZoneBadge zone={zone} />
                  <span className="font-mono text-sm font-semibold text-slate-200">
                    {fleetStats.byZone[zone]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2 text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Primary: </span>
              {organization.primaryContactName || "—"}
              {organization.primaryContactPhone ? (
                <span className="ml-2 font-mono text-cyan-300/90">
                  {formatEmergencyPhoneDisplay(organization.primaryContactPhone)}
                </span>
              ) : null}
            </p>
            {organization.email ? (
              <p>
                <span className="text-slate-500">Primary contact email: </span>
                {organization.email}
              </p>
            ) : null}
            <EmergencyContactDisplay
              name={organization.emergencyContactName}
              phone={organization.emergencyContactPhone}
              compact
            />
            {organization.address ? (
              <p>
                <span className="text-slate-500">Address: </span>
                {organization.address}
              </p>
            ) : null}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned aircraft
            </h3>
            {fleetStats.aircraft.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No aircraft assigned.</p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {fleetStats.aircraft.map((ac) => (
                  <li
                    key={ac.id}
                    className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-950/40 px-3 py-1.5 font-mono text-xs text-cyan-300"
                  >
                    {ac.tailNumber}
                    <span className="text-slate-500">{ac.homeState}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "cyan";
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`mt-0.5 text-xl font-bold tabular-nums ${
          tone === "cyan" ? "text-cyan-300" : "text-slate-100"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
