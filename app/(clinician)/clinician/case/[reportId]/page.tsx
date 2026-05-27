import { notFound } from "next/navigation";
import { differenceInMinutes, differenceInYears, parseISO } from "date-fns";

import type { SoapReport } from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";
import type { Case, Severity, SessionStatus, TranscriptTurn } from "@/lib/types";

import { CaseDetailView } from "./_components/case-detail-view";

type StoredUiMessage = {
  role?: "user" | "assistant" | "system";
  parts?: { type?: string; text?: string }[];
};

function decodeTranscript(raw: string | null): TranscriptTurn[] {
  if (!raw) return [];
  let messages: unknown;
  try {
    messages = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(messages)) return [];

  const turns: TranscriptTurn[] = [];
  for (const message of messages as StoredUiMessage[]) {
    if (!message || (message.role !== "user" && message.role !== "assistant")) {
      continue;
    }
    const text = (message.parts ?? [])
      .map((p) =>
        p?.type === "text" && typeof p.text === "string" ? p.text : "",
      )
      .join("")
      .trim();
    if (!text) continue;
    turns.push({ role: message.role === "user" ? "patient" : "ai", text });
  }
  return turns;
}

export default async function ClinicianCasePage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const supabase = await createClient();

  // RLS scopes consultation_reports to the assigned clinician (or admin).
  // Unassigned reports return no row → notFound. Until the admin assignment
  // flow lands, assign manually via SQL for testing.
  const { data: report } = await supabase
    .from("consultation_reports")
    .select(
      "id, patient_id, vital_record_id, assigned_clinician_id, chief_complaint, status, ai_triage_label, clinician_triage_label, confidence_score, session_started_at, soap_report",
    )
    .eq("id", reportId)
    .maybeSingle();
  if (!report) notFound();

  const [{ data: patient }, { data: vital }, clinicianResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, date_of_birth, sex")
        .eq("id", report.patient_id)
        .maybeSingle(),
      supabase
        .from("vital_records")
        .select(
          "blood_pressure_systolic, blood_pressure_diastolic, temperature_celsius, weight_kg",
        )
        .eq("id", report.vital_record_id)
        .maybeSingle(),
      report.assigned_clinician_id
        ? supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", report.assigned_clinician_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  if (!patient || !vital) notFound();

  // Decrypt the transcript via SECURITY DEFINER. The function's ownership
  // check enforces that auth.uid() is patient or assigned clinician.
  const key = process.env.TRANSCRIPT_ENCRYPTION_KEY;
  let transcript: TranscriptTurn[] = [];
  if (key) {
    const { data: decrypted } = await supabase.rpc(
      "get_decrypted_transcript",
      { report_id: reportId, key },
    );
    if (typeof decrypted === "string") {
      transcript = decodeTranscript(decrypted);
    }
  }

  const age = patient.date_of_birth
    ? differenceInYears(new Date(), parseISO(patient.date_of_birth))
    : 0;
  const sex: "M" | "F" =
    patient.sex && patient.sex.toLowerCase().startsWith("f") ? "F" : "M";

  // The AI severity stands in until the clinician overrides via OverridePanel.
  const severity: Severity =
    (report.clinician_triage_label as Severity | null) ??
    (report.ai_triage_label as Severity | null) ??
    "green";

  const assignedClinicianName = clinicianResult.data
    ? `${clinicianResult.data.first_name} ${clinicianResult.data.last_name}`
    : null;

  const caseRow: Case = {
    id: report.id,
    patientId: report.patient_id,
    name: `${patient.first_name} ${patient.last_name}`,
    age,
    sex,
    complaint: report.chief_complaint,
    severity,
    confidence: report.confidence_score ?? 0,
    arrivedAt: report.session_started_at,
    waitedMin: differenceInMinutes(
      new Date(),
      parseISO(report.session_started_at),
    ),
    vitals: {
      bpSys: vital.blood_pressure_systolic,
      bpDia: vital.blood_pressure_diastolic,
      tempC: Number(vital.temperature_celsius),
      weightKg: Number(vital.weight_kg),
    },
    assignedTo: assignedClinicianName,
    status: report.status as SessionStatus,
  };

  // SOAP may be null if the AI pipeline failed; surface a fallback instead of
  // 404 so the clinician can still see the case head and re-trigger later.
  const soap = report.soap_report as SoapReport | null;
  if (!soap) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-center">
        <h1 className="text-xl font-semibold">Summary not ready</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The AI summary for this session has not finished generating. Try
          refreshing in a few moments, or contact the patient to re-end the
          session.
        </p>
      </div>
    );
  }

  return (
    <CaseDetailView caseRow={caseRow} soap={soap} transcript={transcript} />
  );
}
