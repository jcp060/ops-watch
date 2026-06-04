"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useActiveFlightsStore, useOcc } from "@/context/OccContext";
import { DashboardTabs } from "@/components/DashboardTabs";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { LiveClock } from "@/components/LiveClock";
import { SessionRoleBadge } from "@/components/SessionRoleBadge";

type OccAppShellProps = {
  children: ReactNode;
  showStatusCards?: boolean;
  statusCards?: ReactNode;
  /** Lock layout to viewport height (Command Map — no page scroll). */
  fillViewport?: boolean;
};

export function OccAppShell({
  children,
  showStatusCards = false,
  statusCards,
  fillViewport = false,
}: OccAppShellProps) {
  const pathname = usePathname();
  const { activeFlights } = useActiveFlightsStore();

  return (
    <div
      className={
        fillViewport
          ? "flex h-dvh flex-col overflow-hidden bg-slate-950 text-slate-100"
          : "min-h-full bg-slate-950 text-slate-100"
      }
    >
      <header className="shrink-0 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur">
        <div
          className={`mx-auto flex max-w-[1600px] flex-col px-4 sm:px-6 lg:px-8 ${
            fillViewport ? "gap-2 py-3" : "gap-4 py-5"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-500/90">
                Flight Following
              </p>
              <h1
                className={`mt-1 font-bold tracking-tight text-slate-50 ${
                  fillViewport ? "text-xl" : "text-2xl sm:text-3xl"
                }`}
              >
                Operations Control Center
              </h1>
              {!fillViewport ? (
                <p className="mt-1 text-sm text-slate-400">
                  10-minute verification cycle · live status monitoring
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              <SessionRoleBadge />
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                Live · <LiveClock />
              </div>
            </div>
          </div>

          <Suspense fallback={null}>
            <AccessDeniedNotice />
          </Suspense>

          <EmergencyBanner />

          <DashboardTabs
            pathname={pathname}
            activeCount={activeFlights.length}
          />

          {showStatusCards && statusCards}
        </div>
      </header>

      <main
        className={`mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 ${
          fillViewport
            ? "flex min-h-0 flex-1 flex-col overflow-hidden py-2"
            : "py-6"
        }`}
      >
        {children}
      </main>
    </div>
  );
}

function AccessDeniedNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("access") !== "denied") return null;

  return (
    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
      Access denied — Command Map requires Admin or Supervisor privileges.
    </p>
  );
}
