"use client";

import { useEffect, useId } from "react";

type DeleteUserModalProps = {
  isOpen: boolean;
  userName: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeleteUserModal({
  isOpen,
  userName,
  onConfirm,
  onClose,
}: DeleteUserModalProps) {
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
            Delete User
          </h2>
          <p className="mt-2 text-sm text-slate-300">{userName}</p>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm text-slate-300">
          <p>
            This removes the user from the system user list only. They will no
            longer appear in Settings.
          </p>
          <p className="text-slate-500">
            Flight records, verification logs, and archives keep their original
            attribution (user ID and action history are not changed).
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
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
}
