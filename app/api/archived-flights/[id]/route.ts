import { NextResponse } from "next/server";
import { validateArchiveDeletionRequest } from "@/lib/archive-api";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/archived-flights/:id
 * Body: { archivedAt: number } — epoch ms when the flight was archived.
 * Blocks deletion until 14-day retention has elapsed.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Flight id is required." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "BAD_REQUEST",
        message: "JSON body with archivedAt is required.",
      },
      { status: 400 },
    );
  }

  const archivedAt =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).archivedAt
      : undefined;

  const validation = validateArchiveDeletionRequest(archivedAt);
  if ("ok" in validation && validation.ok === false) {
    const status = validation.error === "RETENTION_LOCKED" ? 403 : 400;
    return NextResponse.json(validation, { status });
  }

  return NextResponse.json({ ok: true, id });
}
