import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isRole, MOCK_COOKIE, roleRoot } from "@/lib/auth/mock";

const ROLE_PREFIX = /^\/(patient|clinician|admin)(?:\/|$)/;
const AUTH_PATHS = new Set(["/login", "/register"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookie = request.cookies.get(MOCK_COOKIE)?.value;
  const role = isRole(cookie) ? cookie : null;

  const roleMatch = pathname.match(ROLE_PREFIX);
  if (roleMatch) {
    const requested = roleMatch[1];
    if (!role) {
      const target = new URL("/login", request.url);
      return NextResponse.redirect(target);
    }
    if (role !== requested) {
      return NextResponse.redirect(new URL(roleRoot(role), request.url));
    }
    return NextResponse.next();
  }

  if (AUTH_PATHS.has(pathname) && role) {
    return NextResponse.redirect(new URL(roleRoot(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/patient/:path*",
    "/clinician/:path*",
    "/admin/:path*",
  ],
};
