import { CommandMapGuard } from "@/components/CommandMapGuard";
import { CommandMapView } from "@/components/CommandMapView";
import { OccAppShell } from "@/components/OccAppShell";

export default function CommandMapPage() {
  return (
    <OccAppShell fillViewport>
      <CommandMapGuard>
        <CommandMapView />
      </CommandMapGuard>
    </OccAppShell>
  );
}
