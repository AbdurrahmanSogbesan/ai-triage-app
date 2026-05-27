import "server-only";

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";

import type { Tables } from "@/types/database";

import { buildSoapSystemPrompt } from "./prompts";
import {
  soapReportContentSchema,
  type SoapReport,
  type SoapReportContent,
} from "./schemas";
import { logUsage } from "./usage-log";

const MODEL_ID = "gemini-2.5-flash";

export type SoapTranscriptTurn = { role: "user" | "assistant"; text: string };

export type GenerateSoapInput = {
  chartName: string;
  chiefComplaint: string;
  patient: Pick<
    Tables<"profiles">,
    "date_of_birth" | "sex" | "preferred_language"
  >;
  vitals: Pick<
    Tables<"vital_records">,
    | "blood_pressure_systolic"
    | "blood_pressure_diastolic"
    | "temperature_celsius"
    | "weight_kg"
  >;
  transcript: SoapTranscriptTurn[];
  languageUsed: string;
};

/**
 * Stage 2 of the AI pipeline. Generates a structured SOAP report from the
 * full transcript using Gemini. Retries once on failure with tighter
 * temperature; if both attempts fail, the error propagates so the caller can
 * decide how to surface it. Metadata (model id, generated_at, language) is
 * stamped server-side rather than trusting LLM fabrication.
 */
export async function generateSoapReport(
  input: GenerateSoapInput,
): Promise<SoapReport> {
  const baseOptions = {
    model: google(MODEL_ID),
    schema: soapReportContentSchema,
    schemaName: "SoapReport",
    schemaDescription:
      "Structured SOAP (Subjective, Objective, Assessment, Plan) report grounded in the transcript and vitals.",
    system: buildSoapSystemPrompt({
      chartName: input.chartName,
      chiefComplaint: input.chiefComplaint,
      patient: input.patient,
      vitals: input.vitals,
      transcript: input.transcript,
    }),
    prompt:
      "Produce the SOAP report now, strictly following the rules and the response schema.",
  };

  let content: SoapReportContent;
  try {
    const { object, usage } = await generateObject({
      ...baseOptions,
      temperature: 0.3,
    });
    logUsage("soap", MODEL_ID, usage);
    content = object;
  } catch (err) {
    console.warn(
      "[generateSoapReport] first attempt failed, retrying once:",
      err instanceof Error ? err.message : err,
    );
    const { object, usage } = await generateObject({
      ...baseOptions,
      temperature: 0.1,
    });
    logUsage("soap (retry)", MODEL_ID, usage);
    content = object;
  }

  return {
    ...content,
    metadata: {
      model: MODEL_ID,
      generated_at: new Date().toISOString(),
      language_used: input.languageUsed,
    },
  };
}
