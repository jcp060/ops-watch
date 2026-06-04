"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type EmergencyCreatedNoticeProps = {
  reportNumber: string | null;
  onDismiss: () => void;
};

export function EmergencyCreatedNotice({
  reportNumber,
  onDismiss,
}: EmergencyCreatedNoticeProps) {
  const [visible, setVisible] = useState(reportNumber !== null);

  useEffect(() => {
    setVisible(reportNumber !== null);
    if (!reportNumber) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [reportNumber, onDismiss]);

  if (!visible || !reportNumber) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-xl border border-red-500/40 bg-slate-900 px-4 py-3 shadow-2xl shadow-red-950/30"
      role="status"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-red-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-200">Emergency response started</p>
          <p className="mt-1 text-sm text-slate-300">
            Incident{" "}
            <span className="font-mono text-cyan-300">{reportNumber}</span> — the
            emergency response checklist opened in a new tab. Continue monitoring
            here.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Supervisors and admins are notified (in-app).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          aria-label="Dismiss"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
