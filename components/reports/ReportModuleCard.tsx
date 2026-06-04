"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { ReportModuleDefinition } from "@/lib/reports-modules";
import { formatDateTime } from "@/lib/format";

type ReportModuleCardProps = {
  module: ReportModuleDefinition;
  recordCount: number;
  lastUpdated: number | null;
};

export function ReportModuleCard({
  module,
  recordCount,
  lastUpdated,
}: ReportModuleCardProps) {
  const Icon = module.icon;
  const isActive = module.status === "active";

  const body = (
    <article
      className={`flex h-full flex-col rounded-xl border p-5 shadow-lg shadow-black/10 transition ${
        isActive
          ? "border-slate-800 bg-slate-900/50 hover:border-cyan-500/40 hover:bg-slate-900/70"
          : "border-slate-800/60 bg-slate-900/30 opacity-75"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
          <Icon className="size-5" aria-hidden />
        </div>
        {!isActive ? (
          <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Coming soon
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-slate-100">{module.title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-400">{module.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total records
          </dt>
          <dd className="mt-0.5 font-mono text-xl font-bold tabular-nums text-cyan-300">
            {recordCount}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Clock className="size-3" aria-hidden />
            Last updated
          </dt>
          <dd className="mt-0.5 text-slate-300">
            {lastUpdated ? formatDateTime(lastUpdated) : "—"}
          </dd>
        </div>
      </dl>

      {isActive ? (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-400">
          Open module
          <ArrowRight className="size-4" aria-hidden />
        </span>
      ) : (
        <span className="mt-5 text-sm text-slate-500">Not yet available</span>
      )}
    </article>
  );

  if (!isActive) {
    return body;
  }

  return (
    <Link href={module.href} className="block h-full focus:outline-none focus:ring-2 focus:ring-cyan-500/40 rounded-xl">
      {body}
    </Link>
  );
}
