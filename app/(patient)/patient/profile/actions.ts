"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  patientBaselineSchema,
  type PatientBaselineInput,
} from "@/lib/schemas/profile";

export async function updatePatientBaseline(
  input: PatientBaselineInput,
): Promise<{ error: string } | { ok: true }> {
  const parsed = patientBaselineSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      blood_group: parsed.data.blood_group,
      genotype: parsed.data.genotype,
      preferred_language: parsed.data.preferred_language,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/patient/profile");
  return { ok: true };
}
