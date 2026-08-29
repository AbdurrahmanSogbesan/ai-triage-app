"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

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

  if (error || !data.user) {
    return { error: error?.message ?? "Sign in failed. Try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    // Auth user exists but no profile row — most likely the signup INSERT
    // failed mid-flow. Surface it instead of dropping them on a half-broken
    // dashboard.
    return {
      error:
        "Your account is missing a profile. Contact support to finish setup.",
    };
  }

  // Invalidate the root layout's render cache so the next request reads the
  // freshly-set session cookies instead of the pre-login render.
  revalidatePath("/", "layout");
  redirect(roleRoot(profile.role));
}

export async function register(input: {
  firstName: string;
  lastName: string;
  dob: string;
  sex: "M" | "F";
  phone: string;
  email: string;
  password: string;
}): Promise<ActionError | void> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
  });

  if (error || !data.user) {
    return {
      error:
        error?.message ?? "Couldn't create your account. Try again.",
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    role: "patient",
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    date_of_birth: input.dob,
    sex: input.sex,
  });

  if (profileError) {
    // Auth user landed but profile insert didn't. The user can technically
    // log in, but `getSessionProfile()` will return null and they'll bounce
    // to /login. Surface so they can retry or contact support.
    return {
      error: `Account created but profile setup failed: ${profileError.message}`,
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
