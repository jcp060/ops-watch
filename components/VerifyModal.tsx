"use client";

import { useEffect, useId, useRef } from "react";
import type { VerificationOutcome } from "@/lib/types";
import { VERIFICATION_OUTCOMES } from "@/lib/types";

type VerifyModalProps = {
  tailNumber: string;
  isOpen: boolean;
  outcome: VerificationOutcome;
  notes: string;
  onOutcomeChange: (outcome: VerificationOutcome) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function VerifyModal({
  tailNumber,
  isOpen,
  outcome,
  notes,
  onOutcomeChange,
  onNotesChange,
  onSubmit,
  onClose,
}: VerifyModalProps) {
  const titleId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    selectRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100">
            Verify Aircraft
          </h2>
          <p className="mt-1 font-mono text-sm text-cyan-400">{tailNumber}</p>
        </div>

        <form
          className="space-y-5 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div>
            <label
              htmlFor="verification-outcome"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Verification outcome
            </label>
            <select
              ref={selectRef}
              id="verification-outcome"
              value={outcome}
              onChange={(event) =>
                onOutcomeChange(event.target.value as VerificationOutcome)
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
            >
              {VERIFICATION_OUTCOMES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {outcome === "Landed Safely" && (
              <p className="mt-2 text-xs text-emerald-400/90">
                This will archive the flight and remove it from active
                monitoring.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="verification-notes"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Notes
            </label>
            <textarea
              id="verification-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              placeholder="Add operational notes..."
              className="w-full resize-y rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              Submit Verification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
