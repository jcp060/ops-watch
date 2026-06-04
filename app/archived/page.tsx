import { redirect } from "next/navigation";

/** Legacy route — archived flights live under Reports. */
export default function ArchivedPage() {
  redirect("/reports/archived-flights");
}
