"use client";

import { Building2 } from "lucide-react";
import type { OrganizationMapSummary } from "@/lib/organization-aircraft";

type OrganizationMapFilterProps = {
  summaries: OrganizationMapSummary[];
  selectedOrganizationId: string | null;
  onSelectOrganizationId: (id: string | null) => void;
};

export function OrganizationMapFilter({
  summaries,
  selectedOrganizationId,
  onSelectOrganizationId,
}: OrganizationMapFilterProps) {
  if (summaries.length === 0) return null;

  return (
    <div className="shrink-0 rounded-lg border border-violet-500/20 bg-slate-950/80 px-3 py-2">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
        <Building2 className="size-3" aria-hidden />
        Filter by organization
      </p>
      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          label="All organizations"
          active={selectedOrganizationId === null}
          onClick={() => onSelectOrganizationId(null)}
        />
        {summaries.map((summary) => (
          <FilterChip
            key={summary.organizationId}
            label={`${summary.organizationName} (${summary.activeCount})`}
            active={selectedOrganizationId === summary.organizationId}
            onClick={() =>
              onSelectOrganizationId(
                selectedOrganizationId === summary.organizationId
                  ? null
                  : summary.organizationId,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-violet-400/50 bg-violet-500/20 text-violet-200"
          : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}
