import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { updateAircraftInRegistry, deleteAircraftById } from "./aircraft-registry";
import { parsePersistedAircraftRegistry } from "./aircraft-persistence";
import { prepareAircraftSave } from "./aircraft-save";
import type { Aircraft } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "aircraft-registry.json");

export async function readServerAircraftRegistry(): Promise<Aircraft[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return parsePersistedAircraftRegistry(raw) ?? [];
  } catch {
    return [];
  }
}

async function writeServerAircraftRegistry(registry: Aircraft[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(registry), "utf8");
}

export async function getServerAircraftById(
  id: string,
): Promise<Aircraft | undefined> {
  const registry = await readServerAircraftRegistry();
  return registry.find((entry) => entry.id === id);
}

export async function createServerAircraft(
  aircraft: Aircraft,
): Promise<
  | { ok: true; aircraft: Aircraft }
  | { ok: false; status: number; message: string }
> {
  const registry = await readServerAircraftRegistry();
  const existingIds = new Set(registry.map((entry) => entry.id));
  const prepared = prepareAircraftSave(aircraft, "create", existingIds);
  if (!prepared.ok) {
    return { ok: false, status: 400, message: prepared.message };
  }

  const next = updateAircraftInRegistry(registry, prepared.aircraft, "create");
  if (next === registry) {
    return { ok: false, status: 409, message: "Aircraft id already exists." };
  }

  await writeServerAircraftRegistry(next);
  return { ok: true, aircraft: prepared.aircraft };
}

export async function updateServerAircraft(
  id: string,
  patch: Aircraft,
): Promise<
  | { ok: true; aircraft: Aircraft }
  | { ok: false; status: number; message: string }
> {
  const registry = await readServerAircraftRegistry();
  const existingIds = new Set(registry.map((entry) => entry.id));
  if (!existingIds.has(id)) {
    return { ok: false, status: 404, message: "Aircraft not found." };
  }

  const prepared = prepareAircraftSave(
    { ...patch, id },
    "edit",
    existingIds,
  );
  if (!prepared.ok) {
    return { ok: false, status: 400, message: prepared.message };
  }

  const next = updateAircraftInRegistry(registry, prepared.aircraft, "edit");
  if (next === registry) {
    return { ok: false, status: 404, message: "Aircraft not found." };
  }

  await writeServerAircraftRegistry(next);
  return { ok: true, aircraft: prepared.aircraft };
}

export async function deleteServerAircraft(
  id: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const registry = await readServerAircraftRegistry();
  const next = deleteAircraftById(registry, id);
  if (next.length === registry.length) {
    return { ok: false, status: 404, message: "Aircraft not found." };
  }
  await writeServerAircraftRegistry(next);
  return { ok: true };
}
