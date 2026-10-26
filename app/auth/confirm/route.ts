import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createPatientProfile } from "@/lib/auth/patient-profile";
import { createClient } from "@/lib/supabase/server";

/**
 * Target of the signup confirmation email. The Supabase "Confirm signup"
 * template must link here with `token_hash` and `type` query params. Uses
 * verifyOtp rather than a PKCE code exchange so the link also works when
 * opened on a different device or browser than the one that registered.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) redirect("/login?reason=confirm_failed");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error || !data.user) redirect("/login?reason=confirm_failed");

  const profileError = await createPatientProfile(supabase, data.user);
  if (profileError) {
    console.error(
      `[auth/confirm] profile insert failed for ${data.user.id}:`,
      profileError,
    );
    // Login retries the insert from the same metadata, so the patient can
    // still recover by signing in. Sign out first: the proxy bounces
    // signed-in users off /login to `/`, which bounces profile-less users
    // back to /login.
    await supabase.auth.signOut();
    redirect("/login?reason=profile_failed");
  }

  redirect("/patient");
}
