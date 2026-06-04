import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  COMMAND_MAP_ROLE_COOKIE,
  isCommandMapRoleCookieValid,
} from "@/lib/access-control";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPage = pathname.startsWith("/command-map");
  const isApi = pathname.startsWith("/api/command-map");

  if (!isPage && !isApi) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(COMMAND_MAP_ROLE_COOKIE)?.value;
  const role = raw ? decodeURIComponent(raw) : undefined;

  if (!isCommandMapRoleCookieValid(role)) {
    if (isApi) {
      return NextResponse.json(
        {
          ok: false,
          error: "FORBIDDEN",
          message: "Command Map requires Admin or Supervisor role.",
        },
        { status: 403 },
      );
    }

    const redirect = new URL("/dashboard", request.url);
    redirect.searchParams.set("access", "denied");
    return NextResponse.redirect(redirect);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/command-map", "/command-map/:path*", "/api/command-map/:path*"],
};
