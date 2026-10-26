"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import {
  createPatientProfile,
  patientSignupMetadata,
} from "@/lib/auth/patient-profile";
import { roleRoot } from "@/lib/auth/roles";
import {
  LAST_ACTIVITY_COOKIE,
  SESSION_STARTED_COOKIE,
} from "@/lib/auth/session-limits";
import { createClient } from "@/lib/supabase/server";

type ActionError = { error: string };

export async function login(input: {
  email: string;
  password: string;
}): Promise<ActionError | void> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });

  if (error?.code === "email_not_confirmed") {
    return {
      error:
        "Confirm your email first — follow the link we sent when you registered.",
    };
  }
  if (error || !data.user) {
    return { error: error?.message ?? "Sign in failed. Try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    // Auth user exists but no profile row — the insert in /auth/confirm
    // failed. Retry it from the signup metadata before giving up, and sign
    // out on failure so the session doesn't strand them on a half-broken
    // dashboard.
    const profileError = await createPatientProfile(supabase, data.user);
    if (profileError) {
      await supabase.auth.signOut();
      return {
        error:
          "Your account is missing a profile. Contact support to finish setup.",
      };
    }
  }

  // Invalidate the root layout's render cache so the next request reads the
  // freshly-set session cookies instead of the pre-login render.
  revalidatePath("/", "layout");
  redirect(roleRoot(profile?.role ?? "patient"));
}

export async function register(input: {
  firstName: string;
  lastName: string;
  dob: string;
  sex: "M" | "F";
  phone: string;
  email: string;
  password: string;
}): Promise<ActionError | { confirmEmail: true } | void> {
  const supabase = await createClient();
  // Server Action POSTs always carry Origin, so this resolves to localhost in
  // dev and the deployed domain in production. Both must be in the Supabase
  // Auth redirect allow-list or Supabase falls back to the Site URL.
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
      data: patientSignupMetadata(input),
    },
  });

  if (error || !data.user) {
    return {
      error:
        error?.message ?? "Couldn't create your account. Try again.",
    };
  }

  // Email confirmation on: no session until the emailed link is followed,
  // and /auth/confirm creates the profile. This branch also covers an
  // already-registered email, which Supabase deliberately reports the same
  // way so signups can't be used to probe for existing accounts.
  if (!data.session) return { confirmEmail: true };

  const profileError = await createPatientProfile(supabase, data.user);
  if (profileError) {
    // Auth user landed but profile insert didn't. Login retries the insert
    // from the signup metadata, so surface it and let them sign in again.
    await supabase.auth.signOut();
    return {
      error: `Account created but profile setup failed: ${profileError}`,
    };
  }

  revalidatePath("/", "layout");
  redirect("/patient");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Otherwise a fresh login on the same browser would inherit the previous
  // session's start time and could be flagged as already-expired.
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_STARTED_COOKIE);
  cookieStore.delete(LAST_ACTIVITY_COOKIE);

  revalidatePath("/", "layout");
  redirect("/login");
}
