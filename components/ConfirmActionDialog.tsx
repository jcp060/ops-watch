"use client";

import { useEffect, useId } from "react";

type ConfirmTone = "cyan" | "emerald";

const CONFIRM_STYLES: Record<ConfirmTone, string> = {
  cyan: "bg-cyan-600 hover:bg-cyan-500 focus:ring-cyan-400/50",
  emerald:
    "border border-emerald-600/50 bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500/40",
};

type ConfirmActionDialogProps = {
  isOpen: boolean;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmTone?: ConfirmTone;
};

export function ConfirmActionDialog({
  isOpen,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  confirmTone = "cyan",
}: ConfirmActionDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p id={titleId} className="text-sm leading-relaxed text-slate-200">
          {message}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 ${CONFIRM_STYLES[confirmTone]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
