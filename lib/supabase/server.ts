import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Server-side Supabase client bound to the request cookies.
 *
 * Use this in:
 *   - Server Components that need to read auth/session
 *   - Server Actions (the .set() calls below need to be inside an action or
 *     a Route Handler — Next will throw if called from a Server Component)
 *
 * The proxy in `proxy.ts` keeps the session cookies fresh on every request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components can't set cookies. Safe to ignore — the
            // proxy refreshes them on the next request.
          }
        },
      },
    }
  );
}
