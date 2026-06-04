import { NextResponse } from "next/server";
import {
  canMutateAircraftViaApi,
  getApiSessionRole,
} from "@/lib/aircraft-api-auth";
import {
  getServerAircraftById,
  updateServerAircraft,
} from "@/lib/aircraft-server-registry";
import type { Aircraft } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const aircraft = await getServerAircraftById(id);

  if (!aircraft) {
    return NextResponse.json(
      { ok: false, message: "Aircraft not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, aircraft });
}

export async function PATCH(request: Request, context: RouteContext) {
  const role = await getApiSessionRole();
  if (!canMutateAircraftViaApi(role)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin or Supervisor role required to update aircraft.",
      },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const result = await updateServerAircraft(id, body as Aircraft);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, aircraft: result.aircraft });
}
