import { cookies } from "next/headers";

import { isRole, MOCK_COOKIE } from "./mock";
import type { Role } from "@/lib/types";

/**
 * Server-only helper: read the mock role cookie. Phase 2 swaps this for the
 * Supabase server-side session helper.
 */
export async function getMockRole(): Promise<Role | null> {
  const store = await cookies();
  const value = store.get(MOCK_COOKIE)?.value;
  return isRole(value) ? value : null;
}
