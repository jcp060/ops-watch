"use client";

import type { ActiveFlight, ZoneFilter } from "@/lib/types";
import { ActiveFlightCard } from "@/components/ActiveFlightCard";
import { ZoneFilterSelect } from "@/components/ZoneFilterSelect";

type ActiveFlightsPanelProps = {
  flights: ActiveFlight[];
  now: number;
  zoneFilter: ZoneFilter;
  onZoneFilterChange: (filter: ZoneFilter) => void;
  onOpenStartFlight: () => void;
  onSelectFlight: (flightId: string) => void;
};

export function ActiveFlightsPanel({
  flights,
  now,
  zoneFilter,
  onZoneFilterChange,
  onOpenStartFlight,
  onSelectFlight,
}: ActiveFlightsPanelProps) {
  const emptyMessage =
    zoneFilter === "all"
      ? "No active flights. Use Start Flight to begin monitoring."
      : `No active flights in the ${zoneFilter} zone.`;

  return (
    <>
      <div className="mb-3 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <ZoneFilterSelect value={zoneFilter} onChange={onZoneFilterChange} />
        <button
          type="button"
          onClick={onOpenStartFlight}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        >
          Start Flight
        </button>
      </div>

      {flights.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2 shadow-xl shadow-black/20 sm:p-2.5">
          <div
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            role="list"
            aria-label="Active flights"
          >
            {flights.map((flight) => (
              <ActiveFlightCard
                key={flight.id}
                flight={flight}
                now={now}
                onSelect={onSelectFlight}
              />
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-center text-[11px] text-slate-600 sm:text-left">
        Tap a tail for details · warning at 2:00 · overdue at 0:00
      </p>
    </>
  );
}
