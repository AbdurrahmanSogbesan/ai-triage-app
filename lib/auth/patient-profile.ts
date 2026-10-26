import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Registration details carried in the auth user's `user_metadata` between
 * signup and email confirmation. The profile row can only be inserted once
 * the user has a session ("users insert own profile" RLS), which with email
 * confirmation on doesn't exist until they follow the emailed link.
 */
type PatientSignupMetadata = {
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  sex: "M" | "F";
};

export function patientSignupMetadata(input: {
  firstName: string;
  lastName: string;
  dob: string;
  sex: "M" | "F";
  phone: string;
}): PatientSignupMetadata {
  return {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone: input.phone.trim(),
    date_of_birth: input.dob,
    sex: input.sex,
  };
}

/**
 * Inserts the patient profile row from the details stashed at signup. Must
 * run on a client whose session belongs to `user`. Returns an error message,
 * or null on success.
 */
export async function createPatientProfile(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<string | null> {
  const meta = user.user_metadata as Partial<PatientSignupMetadata>;
  if (!meta.first_name || !meta.last_name || !meta.date_of_birth || !user.email) {
    return "Registration details are missing from this account.";
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    role: "patient",
    first_name: meta.first_name,
    last_name: meta.last_name,
    email: user.email,
    phone: meta.phone ?? null,
    date_of_birth: meta.date_of_birth,
    sex: meta.sex ?? null,
  });

  return error?.message ?? null;
}
