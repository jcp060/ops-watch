"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search } from "lucide-react";
import { useAircraftStore, useActiveFlightsStore } from "@/context/OccContext";
import { sortAircraftByTailNumber } from "@/lib/aircraft-sort";
import {
  buildStartFlightPickerRows,
  type StartFlightPickerRow,
} from "@/lib/start-flight-picker";
import {
  filterStartFlightAircraft,
  getAircraftCallsign,
} from "@/lib/start-flight-aircraft-search";

type StartFlightModalProps = {
  isOpen: boolean;
  onSelectAircraft: (aircraftId: string) => void;
  onClose: () => void;
};

const searchInputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25";

function availabilityBadgeClass(availability: StartFlightPickerRow["availability"]): string {
  return availability === "ready"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : "border-slate-600 bg-slate-800 text-slate-400";
}

export function StartFlightModal({
  isOpen,
  onSelectAircraft,
  onClose,
}: StartFlightModalProps) {
  const { aircraftRegistry } = useAircraftStore();
  const { activeFlights } = useActiveFlightsStore();
  const titleId = useId();
  const searchId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const highlightedAircraftIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const pickerRows = useMemo(
    () => buildStartFlightPickerRows(aircraftRegistry, activeFlights),
    [aircraftRegistry, activeFlights],
  );

  const availableAircraft = useMemo(
    () => sortAircraftByTailNumber(pickerRows.map((row) => row.aircraft)),
    [pickerRows],
  );

  const filteredAircraft = useMemo(
    () => filterStartFlightAircraft(availableAircraft, searchQuery),
    [availableAircraft, searchQuery],
  );

  const filteredRows = useMemo(() => {
    const byId = new Map(pickerRows.map((row) => [row.aircraft.id, row]));
    return filteredAircraft
      .map((aircraft) => byId.get(aircraft.id))
      .filter((row): row is StartFlightPickerRow => row !== undefined);
  }, [filteredAircraft, pickerRows]);

  const setHighlightAtIndex = useCallback(
    (index: number) => {
      setHighlightedIndex(index);
      highlightedAircraftIdRef.current = filteredRows[index]?.aircraft.id ?? null;
    },
    [filteredRows],
  );

  const resetPickerState = useCallback(() => {
    setSearchQuery("");
    setHighlightedIndex(0);
    highlightedAircraftIdRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetPickerState();
      return;
    }

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, resetPickerState]);

  useEffect(() => {
    setHighlightedIndex(0);
    highlightedAircraftIdRef.current = null;
  }, [searchQuery]);

  useEffect(() => {
    if (filteredRows.length === 0) {
      highlightedAircraftIdRef.current = null;
      setHighlightedIndex(0);
      return;
    }

    const trackedId = highlightedAircraftIdRef.current;
    if (trackedId) {
      const nextIndex = filteredRows.findIndex((row) => row.aircraft.id === trackedId);
      if (nextIndex >= 0) {
        setHighlightedIndex(nextIndex);
        return;
      }
    }

    setHighlightedIndex((index) => Math.min(index, filteredRows.length - 1));
  }, [filteredRows]);

  useEffect(() => {
    if (!isOpen || filteredRows.length === 0) return;

    const option = listRef.current?.querySelector<HTMLElement>(
      `[data-aircraft-option-index="${highlightedIndex}"]`,
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, filteredRows, isOpen]);

  const selectHighlightedAircraft = useCallback(() => {
    const aircraft = filteredRows[highlightedIndex]?.aircraft;
    if (!aircraft) return;
    onSelectAircraft(aircraft.id);
  }, [filteredRows, highlightedIndex, onSelectAircraft]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredRows.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightAtIndex(
        highlightedIndex >= filteredRows.length - 1 ? 0 : highlightedIndex + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightAtIndex(
        highlightedIndex <= 0 ? filteredRows.length - 1 : highlightedIndex - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectHighlightedAircraft();
    }
  };

  if (!isOpen) return null;

  const hasAvailableAircraft = pickerRows.length > 0;
  const hasSearchResults = filteredRows.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-slate-100">
                Start Flight
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Select an aircraft from the registry to begin active monitoring.
              </p>
            </div>
            <span
              className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300"
              title="List updates automatically when fleet status changes"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-cyan-400" aria-hidden />
              Live
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {hasAvailableAircraft && (
            <div className="border-b border-slate-800 px-4 py-3 sm:px-6">
              <label htmlFor={searchId} className="sr-only">
                Search aircraft by tail number, callsign, or type
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <input
                  ref={searchInputRef}
                  id={searchId}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search tail, callsign, or type…"
                  autoComplete="off"
                  enterKeyHint="go"
                  className={searchInputClass}
                />
              </div>
            </div>
          )}

          <div className="min-h-0 overflow-y-auto px-4 py-3 sm:px-6">
            {!hasAvailableAircraft ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No aircraft available. All registry aircraft are currently in an
                active flight session.
              </p>
            ) : !hasSearchResults ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No aircraft found
              </p>
            ) : (
              <ul
                ref={listRef}
                className="space-y-2"
                role="listbox"
                aria-label="Available aircraft"
                aria-live="polite"
              >
                {filteredRows.map((row, index) => {
                  const { aircraft, availability, availabilityLabel } = row;
                  const isHighlighted = index === highlightedIndex;
                  const callsign = getAircraftCallsign(aircraft);

                  return (
                    <li key={aircraft.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isHighlighted}
                        data-aircraft-option-index={index}
                        onClick={() => onSelectAircraft(aircraft.id)}
                        onMouseEnter={() => setHighlightAtIndex(index)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                          isHighlighted
                            ? "border-cyan-500/60 bg-cyan-500/10"
                            : "border-slate-800 bg-slate-950/50 hover:border-cyan-500/40 hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-base font-semibold text-cyan-300">
                            {aircraft.tailNumber}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-slate-400">
                            {aircraft.aircraftType}
                            {callsign ? ` · ${callsign}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${availabilityBadgeClass(availability)}`}
                          >
                            {availabilityLabel}
                          </span>
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                            {aircraft.monitoringZone}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
