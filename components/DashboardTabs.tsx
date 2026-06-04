"use client";

import Link from "next/link";
import { FileBarChart, Radar, Settings } from "lucide-react";
import { useOcc } from "@/context/OccContext";
import { canAccessCommandMap } from "@/lib/access-control";
import { isReportsPath } from "@/lib/reports-modules";

type DashboardTabsProps = {
  pathname: string;
  activeCount: number;
};

type NavItem = {
  href: string;
  label: string;
  count?: number;
  icon?: typeof Radar;
  match: (path: string) => boolean;
};

const OPERATIONAL_TABS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    match: (path) => path === "/",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileBarChart,
    match: (path) => isReportsPath(path),
  },
];

export function DashboardTabs({
  pathname,
  activeCount,
}: DashboardTabsProps) {
  const { session } = useOcc();
  const showCommandMap =
    session.currentUser !== null &&
    canAccessCommandMap(session.currentUser.role);

  const counts: Record<string, number | undefined> = {
    "/": activeCount,
  };

  const isSettingsActive = pathname === "/settings";
  const isCommandMapActive = pathname.startsWith("/command-map");

  return (
    <nav
      className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-1 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Main navigation"
    >
      <div className="flex flex-1 flex-wrap gap-1">
        {OPERATIONAL_TABS.map((tab) => (
          <NavTabLink
            key={tab.href}
            href={tab.href}
            label={tab.label}
            count={counts[tab.href]}
            isSelected={tab.match(pathname)}
          />
        ))}
        {showCommandMap ? (
          <NavTabLink
            href="/command-map"
            label="Command Map"
            icon={Radar}
            isSelected={isCommandMapActive}
          />
        ) : null}
      </div>

      <div className="flex items-center justify-end border-t border-slate-800/80 pt-1 sm:border-t-0 sm:pt-0 sm:pl-2">
        <div
          className="hidden h-8 w-px shrink-0 bg-slate-700 sm:mr-2 sm:block"
          aria-hidden
        />
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={isSettingsActive ? "page" : undefined}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-md transition ${
            isSettingsActive
              ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/40"
              : "text-slate-400 hover:bg-slate-800/60 hover:text-cyan-300"
          }`}
        >
          <Settings
            className="h-[1.125rem] w-[1.125rem] stroke-[1.75]"
            aria-hidden
          />
          <span
            role="tooltip"
            className="pointer-events-none absolute -bottom-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            Settings
          </span>
        </Link>
      </div>
    </nav>
  );
}

function NavTabLink({
  href,
  label,
  count,
  icon: Icon,
  isSelected,
}: {
  href: string;
  label: string;
  count?: number;
  icon?: typeof Radar;
  isSelected: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition sm:px-5 ${
        isSelected
          ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/40"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
      }`}
      aria-current={isSelected ? "page" : undefined}
    >
      {Icon ? <Icon className="size-4 shrink-0 opacity-90" aria-hidden /> : null}
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
            isSelected
              ? "bg-cyan-500/30 text-cyan-100"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
