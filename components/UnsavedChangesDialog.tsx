"use client";

import { useEffect, useId, type MouseEvent } from "react";

type UnsavedChangesDialogProps = {
  isOpen: boolean;
  message?: string;
  onSave: () => void;
  onDiscard: () => void;
  onContinueEditing: () => void;
};

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

export function UnsavedChangesDialog({
  isOpen,
  message = "You have unsaved changes. Save before closing?",
  onSave,
  onDiscard,
  onContinueEditing,
}: UnsavedChangesDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinueEditing();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onContinueEditing]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
        aria-hidden
        onMouseDown={stopPropagation}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl shadow-black/50"
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        onPointerDown={stopPropagation}
      >
        <p id={titleId} className="text-sm leading-relaxed text-slate-200">
          {message}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onContinueEditing}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Continue Editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
