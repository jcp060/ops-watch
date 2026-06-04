import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function LegacyNewEmergencyIncidentPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const id = params.id?.trim();
  if (id) {
    redirect(`/reports/incidents/emergency/${encodeURIComponent(id)}`);
  }
  redirect("/reports/incidents");
}
