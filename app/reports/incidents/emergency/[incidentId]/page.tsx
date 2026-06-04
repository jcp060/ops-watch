import { Suspense } from "react";
import { OccAppShell } from "@/components/OccAppShell";
import { EmergencyResponseRoute } from "@/components/reports/EmergencyResponseRoute";

export default function EmergencyIncidentResponsePage() {
  return (
    <OccAppShell>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
            Loading emergency response workflow…
          </div>
        }
      >
        <EmergencyResponseRoute />
      </Suspense>
    </OccAppShell>
  );
}
