"use server";

import { differenceInMinutes, differenceInYears, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Case, Severity, SessionStatus } from "@/lib/types";

/**
 * Shared row → Case mapper for both the active dashboard and the history page.
 * Splitting it out keeps the two list queries from drifting on shape.
 */
type ReportRow = {
  id: string;
  patient_id: string;
  vital_record_id: string;
  chief_complaint: string;
  ai_triage_label: Severity | null;
  clinician_triage_label: Severity | null;
  clinician_notes?: string | null;
  confidence_score: number | null;
  status: SessionStatus;
  session_started_at: string;
  created_at: string;
  reviewed_at?: string | null;
};

async function hydrateCases(
  reports: ReportRow[],
  clinicianEmail: string | null,
): Promise<Case[]> {
  if (reports.length === 0) return [];
  const supabase = await createClient();

  const patientIds = Array.from(new Set(reports.map((r) => r.patient_id)));
  const vitalIds = Array.from(new Set(reports.map((r) => r.vital_record_id)));

  const [{ data: patients }, { data: vitals }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, date_of_birth, sex")
      .in("id", patientIds),
    supabase
      .from("vital_records")
      .select(
        "id, blood_pressure_systolic, blood_pressure_diastolic, temperature_celsius, weight_kg",
      )
      .in("id", vitalIds),
  ]);

  const patientMap = new Map((patients ?? []).map((p) => [p.id, p]));
  const vitalMap = new Map((vitals ?? []).map((v) => [v.id, v]));

  return reports.map((r) => {
    const patient = patientMap.get(r.patient_id);
    const vital = vitalMap.get(r.vital_record_id);
    const age = patient?.date_of_birth
      ? differenceInYears(new Date(), parseISO(patient.date_of_birth))
      : 0;
    const sex: "M" | "F" =
      patient?.sex?.toLowerCase().startsWith("f") ? "F" : "M";
    const severity: Severity =
      r.clinician_triage_label ?? r.ai_triage_label ?? "green";
    const arrivedAt = r.session_started_at ?? r.created_at;
    return {
      id: r.id,
      patientId: r.patient_id,
      name: patient
        ? `${patient.first_name} ${patient.last_name}`
        : "Unknown patient",
      age,
      sex,
      complaint: r.chief_complaint,
      severity,
      confidence: r.confidence_score ?? 0,
      arrivedAt,
      waitedMin: arrivedAt
        ? differenceInMinutes(new Date(), parseISO(arrivedAt))
        : 0,
      vitals: vital
        ? {
            bpSys: vital.blood_pressure_systolic,
            bpDia: vital.blood_pressure_diastolic,
            tempC: Number(vital.temperature_celsius),
            weightKg: Number(vital.weight_kg),
          }
        : { bpSys: 0, bpDia: 0, tempC: 0, weightKg: 0 },
      assignedTo: clinicianEmail,
      status: r.status,
      aiSeverity: r.ai_triage_label,
      clinicianSeverity: r.clinician_triage_label,
      clinicianNotes: r.clinician_notes ?? null,
      reviewedAt: r.reviewed_at ?? null,
    } satisfies Case;
  });
}

/**
 * Cases assigned to the currently signed-in clinician that are not yet
 * completed. Used by /clinician (dashboard). Completed cases live in
 * /clinician/history (separate query).
 */
export async function getAssignedCases(): Promise<Case[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: reports } = await supabase
    .from("consultation_reports")
    .select(
      "id, patient_id, vital_record_id, chief_complaint, ai_triage_label, clinician_triage_label, confidence_score, status, session_started_at, created_at",
    )
    .eq("assigned_clinician_id", user.id)
    .neq("status", "completed")
    .order("created_at", { ascending: false });
  return hydrateCases((reports ?? []) as ReportRow[], user.email ?? null);
}

/**
 * Cases the signed-in clinician has already completed. Read-only — surfaced
 * on /clinician/history. Ordered by most recently reviewed.
 */
export async function getCompletedCases(): Promise<Case[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: reports } = await supabase
    .from("consultation_reports")
    .select(
      "id, patient_id, vital_record_id, chief_complaint, ai_triage_label, clinician_triage_label, clinician_notes, confidence_score, status, session_started_at, created_at, reviewed_at",
    )
    .eq("assigned_clinician_id", user.id)
    .eq("status", "completed")
    .order("reviewed_at", { ascending: false });
  return hydrateCases((reports ?? []) as ReportRow[], user.email ?? null);
}

/**
 * Clinician commits their review of a case: records their final triage label
 * (which may differ from the AI's), stamps `reviewed_at`, and flips status to
 * `completed`. Idempotent — re-running on a completed case will UPDATE 0 rows
 * because the WHERE clause filters status != 'completed'.
 *
 * `notes` is the free-text rationale from the override form. Required-by-UI
 * (10+ chars) when overriding the AI label; optional otherwise. Empty/whitespace
 * strings are normalised to NULL so the column reflects "no note recorded".
 */
export async function commitCaseReviewAction(
  reportId: string,
  clinicianLevel: Severity,
  notes: string,
): Promise<{ ok: true } | { error: string }> {
  if (!reportId || !clinicianLevel) return { error: "Missing input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const trimmedNotes = notes.trim();

  // RLS scopes UPDATE to the assigned clinician. The status filter prevents
  // re-completing an already-completed case if the action is replayed.
  const { error } = await supabase
    .from("consultation_reports")
    .update({
      clinician_triage_label: clinicianLevel,
      clinician_notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      reviewed_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", reportId)
    .neq("status", "completed");
  if (error) return { error: error.message };

  revalidatePath("/clinician");
  revalidatePath("/clinician/history");
  revalidatePath(`/clinician/case/${reportId}`);
  return { ok: true };
}
