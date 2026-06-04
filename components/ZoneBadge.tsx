import type { MonitoringZone } from "@/lib/types";

const ZONE_STYLES: Record<MonitoringZone, string> = {
  East: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  Central: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  West: "border-orange-500/30 bg-orange-500/10 text-orange-300",
};

export function ZoneBadge({ zone }: { zone: MonitoringZone }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${ZONE_STYLES[zone]}`}
    >
      {zone}
    </span>
  );
}
