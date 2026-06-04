import { OccAppShell } from "@/components/OccAppShell";
import { DashboardStatusCards, DashboardView } from "@/components/DashboardView";

export default function DashboardPage() {
  return (
    <OccAppShell
      showStatusCards
      statusCards={<DashboardStatusCards />}
    >
      <DashboardView />
    </OccAppShell>
  );
}
