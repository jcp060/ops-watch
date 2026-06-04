"use client";

import { useEffect, useId, type MouseEvent, type ReactNode } from "react";

type FormDialogProps = {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  children: ReactNode;
  /** When false, backdrop clicks do not close the modal. Default: true */
  closeOnBackdropClick?: boolean;
  /** When false, Escape does not close the modal. Default: true */
  closeOnEscape?: boolean;
};

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

export function FormDialog({
  title,
  subtitle,
  isOpen,
  onClose,
  onSubmit,
  submitLabel,
  children,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: FormDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

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
        onClick={closeOnBackdropClick ? onClose : undefined}
        onMouseDown={closeOnBackdropClick ? undefined : stopPropagation}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50"
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        onPointerDown={stopPropagation}
      >
        <div className="shrink-0 border-b border-slate-800 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          )}
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {children}
          </div>

          <div className="shrink-0 border-t border-slate-800 bg-slate-900 px-6 py-4">
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
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
