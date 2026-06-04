import type { Aircraft } from "./types";

type ApiAircraftResponse =
  | { ok: true; aircraft?: Aircraft; aircraftRegistry?: Aircraft[] }
  | { ok: false; message: string };

/** Mirror registry changes to the server API (best-effort). */
export async function syncAircraftToApi(
  aircraft: Aircraft,
  mode: "create" | "edit",
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if (mode === "create") {
      await fetch("/api/aircraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aircraft),
      });
      return;
    }

    await fetch(`/api/aircraft/${encodeURIComponent(aircraft.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aircraft),
    });
  } catch {
    /* Local store remains source of truth when API unavailable */
  }
}

export async function fetchAircraftRegistryFromApi(): Promise<Aircraft[] | null> {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch("/api/aircraft", { method: "GET" });
    const payload = (await response.json()) as ApiAircraftResponse;
    if (!response.ok || !payload.ok || !payload.aircraftRegistry) {
      return null;
    }
    return payload.aircraftRegistry;
  } catch {
    return null;
  }
}
