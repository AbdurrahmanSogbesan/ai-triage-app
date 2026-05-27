import { z } from "zod";

export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export const GENOTYPES = ["HbAA", "HbAS", "HbSS", "HbAC", "HbSC"] as const;

export const patientBaselineSchema = z.object({
  blood_group: z.enum(BLOOD_GROUPS).nullable(),
  genotype: z.enum(GENOTYPES).nullable(),
  preferred_language: z
    .string()
    .trim()
    .min(2, "Use 2–8 characters")
    .max(8, "Use 2–8 characters"),
});

export type PatientBaselineInput = z.infer<typeof patientBaselineSchema>;
