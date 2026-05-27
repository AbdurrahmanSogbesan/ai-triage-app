"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { startOfDay } from "date-fns";

import { generateSoapReport } from "@/lib/ai/soap";
import { runReferee } from "@/lib/ai/referee";
import { createClient } from "@/lib/supabase/server";
import {
  chiefComplaintSchema,
  vitalsSchema,
  type ChiefComplaintInput,
  type VitalsInput,
} from "@/lib/schemas/clinical";
import type { Tables } from "@/types/database";

type UiMessagePart = { type: string; text?: string };
type UiMessageShape = {
  role?: "user" | "assistant" | "system";
  parts?: UiMessagePart[];
};

// Convert the persisted UIMessage[] into the clean role/text turns the AI
// agents want. Drops system messages and any non-text parts (e.g. step-start
// markers from AI SDK v6 streaming) and skips empty turns.
function parseTranscriptForAgents(
  raw: string,
): { role: "user" | "assistant"; text: string }[] {
  let messages: unknown;
  try {
    messages = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(messages)) return [];

  const turns: { role: "user" | "assistant"; text: string }[] = [];
  for (const message of messages as UiMessageShape[]) {
    if (!message || (message.role !== "user" && message.role !== "assistant")) {
      continue;
    }
    const text = (message.parts ?? [])
      .map((p) => (p?.type === "text" && typeof p.text === "string" ? p.text : ""))
      .join("")
      .trim();
    if (!text) continue;
    turns.push({ role: message.role, text });
  }
  return turns;
}

function startOfTodayIso(): string {
  return startOfDay(new Date()).toISOString();
}

export async function getHasVitalsToday(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("vital_records")
    .select("id")
    .eq("patient_id", user.id)
    .gte("recorded_at", startOfTodayIso())
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[getHasVitalsToday] query failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function submitVitalsAction(
  input: VitalsInput,
): Promise<{ ok: true } | { error: string }> {
  const parsed = vitalsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid readings." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const readings = {
    blood_pressure_systolic: parsed.data.bpSys,
    blood_pressure_diastolic: parsed.data.bpDia,
    temperature_celsius: parsed.data.tempC,
    weight_kg: parsed.data.weightKg,
  };

  // Update today's existing row in place if there is one, so the Back button on
  // the complaint modal lets the patient correct a typo without spawning a
  // duplicate vital_records row that startConsultationAction would then link.
  const { data: existing, error: existingError } = await supabase
    .from("vital_records")
    .select("id")
    .eq("patient_id", user.id)
    .gte("recorded_at", startOfTodayIso())
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return { error: existingError.message };

  if (existing) {
    const { error } = await supabase
      .from("vital_records")
      .update(readings)
      .eq("id", existing.id);
    if (error) return { error: error.message };
    return { ok: true };
  }

  const { error } = await supabase
    .from("vital_records")
    .insert({ patient_id: user.id, ...readings });
  if (error) return { error: error.message };
  return { ok: true };
}

export type PatientProfile = Pick<
  Tables<"profiles">,
  | "id"
  | "first_name"
  | "last_name"
  | "date_of_birth"
  | "sex"
  | "blood_group"
  | "genotype"
>;

export async function getMyPatientProfile(): Promise<PatientProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, date_of_birth, sex, blood_group, genotype")
    .eq("id", user.id)
    .maybeSingle();
  return data ?? null;
}

export type InProgressSession = Pick<
  Tables<"consultation_reports">,
  "id" | "chief_complaint" | "session_started_at"
>;

export async function getInProgressSession(): Promise<InProgressSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("consultation_reports")
    .select("id, chief_complaint, session_started_at")
    .eq("patient_id", user.id)
    .eq("status", "in_progress")
    .order("session_started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export type RecentSession = Pick<
  Tables<"consultation_reports">,
  "id" | "chief_complaint" | "status" | "created_at" | "soap_report"
>;

export async function getRecentSessions(limit = 20): Promise<RecentSession[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("consultation_reports")
    .select("id, chief_complaint, status, created_at, soap_report")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export type PatientSessionStats = {
  total: number;
  mostRecent: Pick<
    Tables<"consultation_reports">,
    "id" | "chief_complaint" | "status" | "created_at"
  > | null;
  latestReport: Pick<
    Tables<"consultation_reports">,
    "id" | "chief_complaint" | "created_at"
  > | null;
};

export async function getPatientSessionStats(): Promise<PatientSessionStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { total: 0, mostRecent: null, latestReport: null };

  const [{ count }, { data: mostRecent }, { data: latestReport }] = await Promise.all([
    supabase
      .from("consultation_reports")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", user.id),
    supabase
      .from("consultation_reports")
      .select("id, chief_complaint, status, created_at")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("consultation_reports")
      .select("id, chief_complaint, created_at")
      .eq("patient_id", user.id)
      .not("soap_report", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    total: count ?? 0,
    mostRecent: mostRecent ?? null,
    latestReport: latestReport ?? null,
  };
}

export async function endSessionAction(
  reportId: string,
  transcript: string,
): Promise<{ ok: true } | { error: string }> {
  if (!reportId || !transcript) return { error: "Missing input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const key = process.env.TRANSCRIPT_ENCRYPTION_KEY;
  if (!key) {
    console.error("[endSessionAction] TRANSCRIPT_ENCRYPTION_KEY missing.");
    return { error: "Server is misconfigured. Try again later." };
  }

  // SECURITY DEFINER fn checks ownership + status='in_progress', then encrypts
  // the transcript with pgp_sym_encrypt and transitions to awaiting_referee.
  // This is the synchronous critical path — once it succeeds the session is
  // durably ended; the AI pipeline below runs after the response is sent so
  // the patient is not held on the loading state.
  const { error: saveError } = await supabase.rpc(
    "save_consultation_transcript",
    {
      p_report_id: reportId,
      p_transcript: transcript,
      p_key: key,
    },
  );
  if (saveError) return { error: saveError.message };

  // Schedule SOAP + referee generation to run after the response is sent.
  // Failures inside `after()` cannot be surfaced to the patient — the row
  // stays at awaiting_referee with `soap_report = null` and the clinician
  // case page shows the "Summary not ready" fallback until the pipeline is
  // re-run via a worker (not yet built). On Vercel this runs within the
  // function's maxDuration (Pro = 60 s, Hobby = 10 s); set that high enough
  // on the route that calls this action.
  after(async () => {
    try {
      await runAiPipeline({ reportId, transcript, key });
    } catch (err) {
      console.error(
        "[endSessionAction.after] AI pipeline failed:",
        err instanceof Error ? err.message : err,
      );
    }
  });

  revalidatePath("/patient");
  revalidatePath("/patient/sessions");
  return { ok: true };
}

type RunAiPipelineInput = {
  reportId: string;
  transcript: string;
  key: string;
};

async function runAiPipeline({
  reportId,
  transcript,
}: RunAiPipelineInput): Promise<void> {
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("consultation_reports")
    .select(
      "id, chief_complaint, mts_chart_selected, language_used, patient_id, vital_record_id",
    )
    .eq("id", reportId)
    .maybeSingle();
  if (!report) {
    console.error(
      "[runAiPipeline] report not found post-save, skipping:",
      reportId,
    );
    return;
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
    console.error("[runAiPipeline] patient context missing:", reportId);
    return;
  }

  const turns = parseTranscriptForAgents(transcript);
  const chartName = report.mts_chart_selected ?? "Unwell Adult";
  const languageUsed = report.language_used ?? "en";

  // Two-stage persistence so a referee failure (Groq rate limit, transient
  // model error) does not throw away the SOAP that Gemini already produced.
  // Stage 1: SOAP lands; status stays at awaiting_referee until referee runs.
  // Stage 2: referee lands and the row promotes to awaiting_clinician.
  // If stage 2 fails, the clinician page still renders the SOAP — the
  // confidence_score column stays null and the UI falls back to the
  // "Manual review recommended" band, which is the correct signal.
  const soap = await generateSoapReport({
    chartName,
    chiefComplaint: report.chief_complaint,
    patient: profile,
    vitals,
    transcript: turns,
    languageUsed,
  });

  const { error: soapUpdateError } = await supabase
    .from("consultation_reports")
    .update({
      soap_report: soap,
      ai_triage_label: soap.assessment.triage_level,
    })
    .eq("id", reportId);
  if (soapUpdateError) {
    console.error(
      "[runAiPipeline] failed to persist SOAP:",
      soapUpdateError.message,
    );
    return;
  }

  revalidatePath("/patient");
  revalidatePath("/patient/sessions");

  try {
    const referee = await runReferee({
      chartName,
      chiefComplaint: report.chief_complaint,
      vitals,
      transcript: turns,
      soap,
    });

    const { error: refereeUpdateError } = await supabase
      .from("consultation_reports")
      .update({
        confidence_score: referee.confidence_score,
        referee_flags: referee,
        status: "awaiting_clinician",
      })
      .eq("id", reportId);
    if (refereeUpdateError) {
      console.error(
        "[runAiPipeline] failed to persist referee:",
        refereeUpdateError.message,
      );
      return;
    }

    revalidatePath("/patient");
    revalidatePath("/patient/sessions");
  } catch (err) {
    console.error(
      "[runAiPipeline] referee failed (SOAP already persisted):",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function abandonSessionAction(
  reportId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Only transitions live sessions. RLS scopes the row to the owner; the
  // status filter prevents re-abandoning a completed or already-abandoned
  // session if someone replays the request.
  const { error } = await supabase
    .from("consultation_reports")
    .update({ status: "abandoned", session_ended_at: new Date().toISOString() })
    .eq("id", reportId)
    .eq("status", "in_progress");
  if (error) return { error: error.message };

  revalidatePath("/patient");
  revalidatePath("/patient/sessions");
  return { ok: true };
}

export async function startConsultationAction(
  input: ChiefComplaintInput,
): Promise<{ reportId: string } | { error: string }> {
  const parsed = chiefComplaintSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Tell us a little more about what's going on." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // The consultation must be bound to a vital_record for the same patient.
  // We use the most recent vital recorded today — the intake flow has just
  // captured one (or confirmed an existing one) before this point.
  const { data: vital, error: vitalError } = await supabase
    .from("vital_records")
    .select("id")
    .eq("patient_id", user.id)
    .gte("recorded_at", startOfTodayIso())
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (vitalError) return { error: vitalError.message };
  if (!vital) return { error: "Please record your vitals first." };

  const { data, error } = await supabase
    .from("consultation_reports")
    .insert({
      patient_id: user.id,
      vital_record_id: vital.id,
      chief_complaint: parsed.data.complaint,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { reportId: data.id };
}
