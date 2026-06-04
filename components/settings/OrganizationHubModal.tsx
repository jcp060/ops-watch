"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Building2, Plane, ShieldAlert, X } from "lucide-react";
import { EmergencyContactDisplay } from "@/components/aircraft/EmergencyContactDisplay";
import {
  OrganizationResponsePlanEditor,
  type ResponsePlanEditorHandle,
} from "@/components/settings/OrganizationResponsePlanEditor";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { ZoneBadge } from "@/components/ZoneBadge";
import { canManageOrganizationResponsePlan } from "@/lib/access-control";
import { formatEmergencyPhoneDisplay } from "@/lib/emergency-contact";
import type { OrganizationFleetStats } from "@/lib/organization-aircraft";
import type { OccUser, Organization } from "@/lib/types";

type OrganizationHubModalProps = {
  organization: Organization | null;
  fleetStats: OrganizationFleetStats | null;
  currentUser: OccUser | null;
  onClose: () => void;
};

type HubTab = "details" | "aircraft" | "response-plan";

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

export function OrganizationHubModal({
  organization,
  fleetStats,
  currentUser,
  onClose,
}: OrganizationHubModalProps) {
  const [tab, setTab] = useState<HubTab>("details");
  const [responsePlanDirty, setResponsePlanDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const responsePlanEditorRef = useRef<ResponsePlanEditorHandle>(null);

  const canEditPlan = useMemo(() => {
    if (!organization || !currentUser) return false;
    return canManageOrganizationResponsePlan(
      currentUser.role,
      organization.id,
      currentUser,
    );
  }, [organization, currentUser]);

  const isOpen = Boolean(organization && fleetStats);

  const requestClose = useCallback(() => {
    if (tab === "response-plan" && responsePlanDirty) {
      setShowUnsavedDialog(true);
      return;
    }
    onClose();
  }, [onClose, responsePlanDirty, tab]);

  const handleSaveAndClose = useCallback(() => {
    const saved = responsePlanEditorRef.current?.save() ?? false;
    if (!saved) {
      setShowUnsavedDialog(false);
      return;
    }
    setShowUnsavedDialog(false);
    onClose();
  }, [onClose]);

  const handleDiscardAndClose = useCallback(() => {
    responsePlanEditorRef.current?.discard();
    setShowUnsavedDialog(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || showUnsavedDialog) return;
      event.preventDefault();
      requestClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, requestClose, showUnsavedDialog]);

  useEffect(() => {
    if (!isOpen) {
      setTab("details");
      setResponsePlanDirty(false);
      setShowUnsavedDialog(false);
    }
  }, [isOpen]);

  if (!organization || !fleetStats) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="presentation"
      >
        <div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          aria-hidden
          onMouseDown={stopPropagation}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-violet-500/25 bg-slate-900 shadow-2xl"
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          onPointerDown={stopPropagation}
        >
          <header className="shrink-0 border-b border-slate-800 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
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
                onClick={requestClose}
                className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="mt-4 flex flex-wrap gap-2" aria-label="Organization sections">
              <TabButton active={tab === "details"} onClick={() => setTab("details")}>
                Details
              </TabButton>
              <TabButton active={tab === "aircraft"} onClick={() => setTab("aircraft")}>
                Aircraft
              </TabButton>
              <TabButton
                active={tab === "response-plan"}
                onClick={() => setTab("response-plan")}
              >
                <ShieldAlert className="size-3.5" aria-hidden />
                Emergency Response Plan
              </TabButton>
            </nav>
          </header>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
            onPointerDown={stopPropagation}
          >
            {tab === "details" ? (
              <DetailsTab organization={organization} fleetStats={fleetStats} />
            ) : null}
            {tab === "aircraft" ? (
              <AircraftTab fleetStats={fleetStats} />
            ) : null}
            {tab === "response-plan" ? (
              <OrganizationResponsePlanEditor
                ref={responsePlanEditorRef}
                organization={organization}
                canEdit={canEditPlan}
                currentUser={currentUser}
                onDirtyChange={setResponsePlanDirty}
                onCancel={requestClose}
                onSaved={onClose}
              />
            ) : null}
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSaveAndClose}
        onDiscard={handleDiscardAndClose}
        onContinueEditing={() => setShowUnsavedDialog(false)}
      />
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-violet-600 text-white"
          : "border border-slate-700 text-slate-400 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function DetailsTab({
  organization,
  fleetStats,
}: {
  organization: Organization;
  fleetStats: OrganizationFleetStats;
}) {
  return (
    <div className="space-y-5">
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
    </div>
  );
}

function AircraftTab({ fleetStats }: { fleetStats: OrganizationFleetStats }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Plane className="size-4 text-cyan-400" aria-hidden />
        Assigned aircraft
      </h3>
      {fleetStats.aircraft.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No aircraft assigned.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {fleetStats.aircraft.map((ac) => (
            <li
              key={ac.id}
              className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-950/40 px-3 py-2 font-mono text-xs text-cyan-300"
            >
              {ac.tailNumber}
              <span className="text-slate-500">{ac.homeState}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
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
