import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

export type SessionProfile = {
  user: User;
  profile: Profile;
};

/**
 * Server-only: returns the logged-in user + their profile row, or null if
 * either is missing. A non-null result means the session is valid AND the
 * profile insert that follows signup actually landed.
 *
 * Layouts and the root page use this to gate role access in one DB hit;
 * the auth-presence gate in `proxy.ts` runs first so most unauth visitors
 * never reach this call.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    console.warn("[getSessionProfile] auth.getUser failed:", userError.message);
  }
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    if (profileError) {
      console.warn(
        `[getSessionProfile] profiles lookup failed for ${user.id}:`,
        profileError.message
      );
    }
    return null;
  }

  return { user, profile };
}
