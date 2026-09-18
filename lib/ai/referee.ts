import "server-only";

import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";

import type { Tables } from "@/types/database";

import { buildRefereeSystemPrompt } from "./prompts";
import {
  refereeOutputContentSchema,
  type RefereeOutput,
  type RefereeOutputContent,
  type SoapReport,
} from "./schemas";
import { logUsage } from "./usage-log";

// gpt-oss-120b supports response_format=json_schema, which generateObject
// relies on by default; llama-3.3-70b-versatile returns "response format not
// supported" for the same call. It is also a different model lineage from the
// Gemini model that writes the SOAP, which is the point of the audit: the
// referee must not share the generator's failure modes.
const MODEL_ID = "openai/gpt-oss-120b";

export type RefereeTranscriptTurn = { role: "user" | "assistant"; text: string };

export type RunRefereeInput = {
  chartName: string;
  chiefComplaint: string;
  vitals: Pick<
    Tables<"vital_records">,
    | "blood_pressure_systolic"
    | "blood_pressure_diastolic"
    | "temperature_celsius"
    | "weight_kg"
  >;
  transcript: RefereeTranscriptTurn[];
  soap: SoapReport;
};

/**
 * Stage 3 of the AI pipeline. Independently audits the SOAP report against
 * the source transcript using a different model (Groq openai/gpt-oss-120b) so the
 * critique is genuinely independent of the Gemini-generated SOAP. Output
 * shape is the auditor's confidence score, structured checks, and concrete
 * defect flags. Retries once on failure with tighter temperature.
 */
export async function runReferee(input: RunRefereeInput): Promise<RefereeOutput> {
  const baseOptions = {
    model: groq(MODEL_ID),
    schema: refereeOutputContentSchema,
    schemaName: "RefereeAudit",
    schemaDescription:
      "Independent audit of a SOAP report: confidence score (0–100), structured checks, and concrete defect flags.",
    system: buildRefereeSystemPrompt({
      chartName: input.chartName,
      chiefComplaint: input.chiefComplaint,
      vitals: input.vitals,
      transcript: input.transcript,
      soapJson: JSON.stringify(input.soap, null, 2),
    }),
    prompt:
      "Audit the SOAP report now, strictly following the rules and the response schema.",
  };

  let content: RefereeOutputContent;
  try {
    const { object, usage } = await generateObject({
      ...baseOptions,
      temperature: 0.2,
    });
    logUsage("referee", MODEL_ID, usage);
    content = object;
  } catch (err) {
    console.warn(
      "[runReferee] first attempt failed, retrying once:",
      err instanceof Error ? err.message : err,
    );
    const { object, usage } = await generateObject({
      ...baseOptions,
      temperature: 0.1,
    });
    logUsage("referee (retry)", MODEL_ID, usage);
    content = object;
  }

  return {
    ...content,
    model: MODEL_ID,
    evaluated_at: new Date().toISOString(),
  };
}
