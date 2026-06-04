import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COMMAND_MAP_ROLE_COOKIE,
  isCommandMapRoleCookieValid,
} from "@/lib/access-control";

/** Server-side gate for Command Map resources. */
export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COMMAND_MAP_ROLE_COOKIE)?.value;
  const role = raw ? decodeURIComponent(raw) : undefined;

  if (!isCommandMapRoleCookieValid(role)) {
    return NextResponse.json(
      {
        ok: false,
        error: "FORBIDDEN",
        message: "Command Map requires Admin or Supervisor role.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true, role });
}
