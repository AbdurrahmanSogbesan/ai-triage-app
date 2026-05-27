import "server-only";

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";

import type { Tables } from "@/types/database";

import {
  chartListForPrompt,
  describeAge,
  describeSex,
  formatVitalsForPrompt,
} from "./prompts";
import { chartSelectorSchema, type ChartSelectorOutput } from "./schemas";
import { logUsage } from "./usage-log";

const MODEL_ID = "gemini-2.5-flash";

export type SelectChartInput = {
  chiefComplaint: string;
  patient: Pick<Tables<"profiles">, "date_of_birth" | "sex">;
  vitals: Pick<
    Tables<"vital_records">,
    | "blood_pressure_systolic"
    | "blood_pressure_diastolic"
    | "temperature_celsius"
    | "weight_kg"
  >;
};

const SYSTEM_PROMPT = `You are a medical triage assistant for a Nigerian outpatient clinic.

Pick the single best-fitting Manchester Triage System chart for the patient's presentation based on their chief complaint, age, sex, and recorded vitals.

If the complaint does not clearly fit any of the listed charts — for example eye, urinary, dental, or obstetric/gynaecological issues — choose "Unwell Adult" instead of forcing a poor fit.

If the complaint is ambiguous between two charts, pick the one with higher acuity.

Return the chart name exactly as it appears in the list, and a one-sentence rationale.`;

function buildUserPrompt(input: SelectChartInput): string {
  const age = describeAge(input.patient.date_of_birth);
  const sex = describeSex(input.patient.sex);
  const vitalsLine = formatVitalsForPrompt(input.vitals);
  return [
    `Chief complaint: ${input.chiefComplaint.trim()}`,
    `Patient: ${age} ${sex}`,
    `Vitals: ${vitalsLine}`,
    "",
    "Available charts:",
    chartListForPrompt(),
  ].join("\n");
}

/**
 * Stage 1 of the Primary Analyst. Picks one MTS chart for the interview to
 * follow. Retries once on any failure (schema mismatch, transient API error)
 * with tighter temperature; if the retry also fails the error propagates so
 * the caller can decide whether to fall back or surface a session-start error.
 */
export async function selectChart(
  input: SelectChartInput,
): Promise<ChartSelectorOutput> {
  const model = google(MODEL_ID);
  const baseOptions = {
    model,
    schema: chartSelectorSchema,
    schemaName: "ChartSelection",
    schemaDescription:
      "The chosen MTS chart name (from the enumerated list) and a one-sentence rationale.",
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
  };

  try {
    const { object, usage } = await generateObject({
      ...baseOptions,
      temperature: 0.2,
    });
    logUsage("chart-selector", MODEL_ID, usage);
    return object;
  } catch (err) {
    console.warn(
      "[selectChart] first attempt failed, retrying once:",
      err instanceof Error ? err.message : err,
    );
    const { object, usage } = await generateObject({
      ...baseOptions,
      temperature: 0.1,
    });
    logUsage("chart-selector (retry)", MODEL_ID, usage);
    return object;
  }
}
