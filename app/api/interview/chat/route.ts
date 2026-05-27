import "server-only";

import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { selectChart } from "@/lib/ai/chart-selector";
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts";
import { logUsage } from "@/lib/ai/usage-log";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MODEL_ID = "gemini-2.5-flash";

type RequestBody = {
  messages: UIMessage[];
  reportId: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as RequestBody;
  if (!body?.reportId || !Array.isArray(body.messages)) {
    return new Response("Bad request", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // RLS scopes consultation_reports to the owning patient and assigned
  // clinician, so an unauthorized caller gets no row back.
  const { data: report, error: reportError } = await supabase
    .from("consultation_reports")
    .select(
      "id, chief_complaint, mts_chart_selected, vital_record_id, patient_id, status",
    )
    .eq("id", body.reportId)
    .maybeSingle();
  if (reportError || !report) {
    return new Response("Not found", { status: 404 });
  }
  if (report.status !== "in_progress") {
    return new Response("Session is no longer in progress", { status: 409 });
  }

  const [{ data: profile }, { data: vitals }] = await Promise.all([
    supabase
      .from("profiles")
      .select("date_of_birth, sex, preferred_language")
      .eq("id", report.patient_id)
      .maybeSingle(),
    supabase
      .from("vital_records")
      .select(
        "blood_pressure_systolic, blood_pressure_diastolic, temperature_celsius, weight_kg",
      )
      .eq("id", report.vital_record_id)
      .maybeSingle(),
  ]);
  if (!profile || !vitals) {
    return new Response("Patient context missing", { status: 500 });
  }

  // Pick the MTS chart once at session start and cache it on the row so every
  // subsequent message uses the same chart. Falls back to Unwell Adult if the
  // selector errors twice — the interview can still proceed with general
  // discriminators rather than blocking the patient.
  let chartName = report.mts_chart_selected;
  if (!chartName) {
    try {
      const selection = await selectChart({
        chiefComplaint: report.chief_complaint,
        patient: profile,
        vitals,
      });
      chartName = selection.chart;
    } catch (err) {
      console.warn(
        "[interview/chat] chart selection failed, defaulting to Unwell Adult:",
        err instanceof Error ? err.message : err,
      );
      chartName = "Unwell Adult";
    }
    await supabase
      .from("consultation_reports")
      .update({ mts_chart_selected: chartName })
      .eq("id", body.reportId);
  }

  const system = buildInterviewSystemPrompt({
    chartName,
    chiefComplaint: report.chief_complaint,
    patient: profile,
    vitals,
  });

  const result = streamText({
    model: google(MODEL_ID),
    system,
    messages: await convertToModelMessages(body.messages),
    temperature: 0.4,
    // Gemini 2.5 Flash enables internal "thinking" by default — billed as
    // output tokens but stripped from the streamed reply. For short triage
    // Q&A turns the deliberation adds ~10× output tokens and several seconds
    // of latency without improving the question quality. The SOAP and chart
    // selector keep thinking on (they benefit from deliberation).
    providerOptions: {
      google: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    },
    onFinish({ usage }) {
      logUsage("interview-chat", MODEL_ID, usage);
    },
  });

  return result.toUIMessageStreamResponse();
}
