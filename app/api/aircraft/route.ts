import { NextResponse } from "next/server";
import {
  canMutateAircraftViaApi,
  getApiSessionRole,
} from "@/lib/aircraft-api-auth";
import {
  createServerAircraft,
  readServerAircraftRegistry,
} from "@/lib/aircraft-server-registry";
import type { Aircraft } from "@/lib/types";

export async function GET() {
  const registry = await readServerAircraftRegistry();
  return NextResponse.json({ ok: true, aircraftRegistry: registry });
}

export async function POST(request: Request) {
  const role = await getApiSessionRole();
  if (!canMutateAircraftViaApi(role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin or Supervisor role required to create aircraft.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const result = await createServerAircraft(body as Aircraft);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, aircraft: result.aircraft }, { status: 201 });
}
