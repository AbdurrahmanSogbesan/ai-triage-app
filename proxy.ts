import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_PREFIX = /^\/(patient|clinician|admin)(?:\/|$)/;
const AUTH_PATHS = new Set(["/login", "/register"]);

/**
 * Next 16 renamed `middleware` → `proxy`. Function and mechanism are identical.
 *
 * Responsibilities:
 *   1. Refresh Supabase auth cookies on every matched request so the session
 *      stays alive across reloads.
 *   2. Bounce unauthenticated users away from /patient, /clinician, /admin → /login.
 *   3. Bounce authenticated users away from /login, /register → /, which then
 *      redirects them to their role root.
 *
 * Role-vs-role gating (patient hitting /clinician, etc.) is NOT done here —
 * that needs the profile row which costs a DB query. Layouts under each role
 * group do the role check using the profile they already fetch for the sidebar.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do NOT put logic between createServerClient and getUser — the cookie
  // refresh side effect depends on getUser being the first call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const onProtected = ROLE_PREFIX.test(pathname);
  const onAuthPath = AUTH_PATHS.has(pathname);

  if (!user && onProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && onAuthPath) {
    // Defer role resolution to `/` (a server component that reads the profile
    // and redirects to /patient | /clinician | /admin). Keeps the proxy DB-free.
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
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
