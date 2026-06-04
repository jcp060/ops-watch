import { formatDateTime } from "@/lib/format";
import type { VerificationRecord } from "@/lib/types";

export function VerificationHistoryList({
  records,
}: {
  records: VerificationRecord[];
}) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-slate-500">No verification records.</p>
    );
  }

  const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-2">
      {sorted.map((record) => (
        <div
          key={record.id}
          className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-xs font-medium text-slate-300">
              {formatDateTime(record.timestamp)}
            </p>
            <span className="inline-flex w-fit rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
              {record.outcome}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{record.employeeAction}</p>
          {record.notes ? (
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-medium text-slate-400">Notes:</span>{" "}
              {record.notes}
            </p>
          ) : (
            <p className="mt-1 text-sm italic text-slate-600">No notes provided.</p>
          )}
        </div>
      ))}
    </div>
  );
}
