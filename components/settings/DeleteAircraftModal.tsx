"use client";

import { useEffect, useId } from "react";

type DeleteAircraftModalProps = {
  isOpen: boolean;
  tailNumber: string;
  hasActiveFlight: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeleteAircraftModal({
  isOpen,
  tailNumber,
  hasActiveFlight,
  onConfirm,
  onClose,
}: DeleteAircraftModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-xl border border-red-500/30 bg-slate-900 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100">
            Delete Aircraft
          </h2>
          <p className="mt-2 font-mono text-sm text-cyan-400">{tailNumber}</p>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm text-slate-300">
          <p>
            This will permanently remove the aircraft from the registry. It will
            no longer appear in Settings or Start Flight.
          </p>
          {hasActiveFlight && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200/90">
              This aircraft has an active flight session. Deleting the registry
              entry will not end that flight or remove archived history.
            </p>
          )}
          <p className="text-slate-500">
            Active and archived flight records are not deleted.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          >
            Delete Aircraft
          </button>
        </div>
      </div>
    </div>
  );
}
