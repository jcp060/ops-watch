"use client";

import { useParams } from "next/navigation";
import { EmergencyResponseWorkflow } from "@/components/reports/EmergencyResponseWorkflow";

export function EmergencyResponseRoute() {
  const params = useParams();
  const raw = params.incidentId;
  const incidentId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";

  return <EmergencyResponseWorkflow incidentId={incidentId} />;
}
