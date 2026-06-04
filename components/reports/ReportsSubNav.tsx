"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACTIVE_REPORT_MODULES } from "@/lib/reports-modules";

export function ReportsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-2"
      aria-label="Reports sections"
    >
      <Link
        href="/reports"
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          pathname === "/reports"
            ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/40"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
        }`}
        aria-current={pathname === "/reports" ? "page" : undefined}
      >
        Overview
      </Link>
      {ACTIVE_REPORT_MODULES.map((module) => {
        const isActive = pathname.startsWith(module.href);
        return (
          <Link
            key={module.id}
            href={module.href}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/40"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {module.title}
          </Link>
        );
      })}
    </nav>
  );
}
