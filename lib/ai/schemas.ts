import { z } from "zod";
import { MTS_CHART_NAMES, TRIAGE_LEVELS } from "./mts-charts";

export const chartSelectorSchema = z.object({
  chart: z.enum(MTS_CHART_NAMES),
  rationale: z
    .string()
    .min(1)
    .describe("One sentence explaining why this chart fits the complaint."),
});
export type ChartSelectorOutput = z.infer<typeof chartSelectorSchema>;

const triageLevelSchema = z.enum(TRIAGE_LEVELS);

const discriminatorTriggeredSchema = z.object({
  name: z.string().min(1),
  evidence: z.string().min(1),
});

export const soapReportSchema = z.object({
  subjective: z.object({
    chief_complaint: z.string().min(1),
    history_of_present_illness: z.string().min(1),
    associated_symptoms: z.array(z.string()),
    past_medical_history: z.array(z.string()),
    current_medications: z.array(z.string()),
    allergies: z.array(z.string()),
    social_history: z.string().optional(),
  }),
  objective: z.object({
    vitals: z.object({
      blood_pressure: z.string().min(1),
      temperature_celsius: z.number(),
      weight_kg: z.number(),
    }),
    general_observations: z.string().optional(),
  }),
  assessment: z.object({
    mts_chart_used: z.string().min(1),
    discriminators_triggered: z.array(discriminatorTriggeredSchema),
    triage_level: triageLevelSchema,
    rationale: z.string().min(1),
  }),
  plan: z.object({
    next_steps: z.array(z.string()),
    red_flags_to_monitor: z.array(z.string()),
  }),
  metadata: z.object({
    model: z.string().min(1),
    generated_at: z.string().min(1),
    language_used: z.string().min(1),
  }),
});

export type SoapReport = z.infer<typeof soapReportSchema>;

/**
 * Subset of soapReportSchema for generateObject calls. Metadata is injected
 * server-side after the LLM call so we control the model name, timestamp,
 * and detected language rather than trusting LLM fabrication.
 */
export const soapReportContentSchema = soapReportSchema.omit({
  metadata: true,
});
export type SoapReportContent = z.infer<typeof soapReportContentSchema>;

const refereeFlagSchema = z.object({
  type: z.enum([
    "severity_mismatch",
    "symptom_omitted",
    "complaint_drift",
    "red_flag_omitted",
  ]),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string().min(1),
});

export const refereeOutputSchema = z.object({
  confidence_score: z.number().int().min(0).max(100),
  model: z.string().min(1),
  evaluated_at: z.string().min(1),
  checks: z.object({
    severity_consistent_with_vitals: z.boolean(),
    all_symptoms_captured: z.boolean(),
    chief_complaint_aligned: z.boolean(),
    red_flags_not_omitted: z.boolean(),
  }),
  flags: z.array(refereeFlagSchema),
});

export type RefereeOutput = z.infer<typeof refereeOutputSchema>;

/**
 * Subset of refereeOutputSchema for generateObject calls. Same rationale as
 * soapReportContentSchema — server injects model + evaluated_at after the call.
 */
export const refereeOutputContentSchema = refereeOutputSchema.omit({
  model: true,
  evaluated_at: true,
});
export type RefereeOutputContent = z.infer<typeof refereeOutputContentSchema>;
