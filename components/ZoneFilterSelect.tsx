import { ZONE_FILTER_OPTIONS } from "@/lib/monitoring-zones";
import type { ZoneFilter } from "@/lib/types";

type ZoneFilterSelectProps = {
  value: ZoneFilter;
  onChange: (value: ZoneFilter) => void;
};

export function ZoneFilterSelect({ value, onChange }: ZoneFilterSelectProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label
        htmlFor="zone-filter"
        className="text-xs font-semibold uppercase tracking-wider text-slate-500"
      >
        Zone Filter
      </label>
      <select
        id="zone-filter"
        value={value}
        onChange={(event) => onChange(event.target.value as ZoneFilter)}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25 sm:w-48"
      >
        {ZONE_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
