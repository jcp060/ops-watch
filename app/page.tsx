import { OccAppShell } from "@/components/OccAppShell";
import { DashboardStatusCards, DashboardView } from "@/components/DashboardView";

export default function HomePage() {
  return (
    <OccAppShell
      showStatusCards
      statusCards={<DashboardStatusCards />}
    >
      <DashboardView />
    </OccAppShell>
  );
}
