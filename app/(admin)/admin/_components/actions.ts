"use server";

import { differenceInMinutes, differenceInYears, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Case, Clinician } from "@/lib/types";

// Admin views the queue and assignment metadata only — no clinical content.
// All admin queries deliberately omit chief_complaint / soap_report / vitals
// / ai_triage_label / confidence_score / referee_flags / encrypted_transcript.
// The Case shape is reused (it's what AdminQueue consumes) with clinical
// fields stubbed to zero/empty; the UI never reads them for the admin role.

export async function getAdminQueue(): Promise<Case[]> {
  const supabase = await createClient();

  const { data: queueRows } = await supabase
    .from("admin_queue_view")
    .select(
      "id, patient_id, patient_name, status, assigned_clinician_id, created_at, session_ended_at",
    )
    .order("created_at", { ascending: false });
  if (!queueRows) return [];

  const profileIds = Array.from(
    new Set(
      queueRows
        .flatMap((r) => [r.patient_id, r.assigned_clinician_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, date_of_birth, sex")
    .in("id", profileIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return queueRows.map((row) => {
    const patient = row.patient_id ? profileMap.get(row.patient_id) : null;
    const clinician = row.assigned_clinician_id
      ? profileMap.get(row.assigned_clinician_id)
      : null;
    const age = patient?.date_of_birth
      ? differenceInYears(new Date(), parseISO(patient.date_of_birth))
      : 0;
    const sex: "M" | "F" = patient?.sex?.toLowerCase().startsWith("f")
      ? "F"
      : "M";
    return {
      id: row.id!,
      patientId: row.patient_id!,
      name: row.patient_name ?? "Unknown",
      age,
      sex,
      complaint: "",
      severity: "green",
      confidence: 0,
      arrivedAt: row.created_at!,
      // Only meaningful while unassigned — once a clinician has the case,
      // it's off the admin's queue and doesn't need a wait value.
      waitedMin:
        !row.assigned_clinician_id && row.session_ended_at
          ? differenceInMinutes(new Date(), parseISO(row.session_ended_at))
          : 0,
      vitals: { bpSys: 0, bpDia: 0, tempC: 0, weightKg: 0 },
      assignedTo: clinician
        ? `Dr. ${clinician.first_name} ${clinician.last_name}`
        : null,
      status: row.status!,
    } satisfies Case;
  });
}

export async function getClinicianRoster(): Promise<Clinician[]> {
  const supabase = await createClient();

  const { data: clinicians } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, speciality")
    .eq("role", "clinician");
  if (!clinicians) return [];

  // Per-clinician load = count of consultation_reports they are assigned to
  // that are not yet completed. Admin RLS permits SELECT on all reports.
  const { data: counts } = await supabase
    .from("consultation_reports")
    .select("assigned_clinician_id, status")
    .not("assigned_clinician_id", "is", null)
    .neq("status", "completed");

  const loadByClinician = new Map<string, number>();
  for (const row of counts ?? []) {
    if (!row.assigned_clinician_id) continue;
    loadByClinician.set(
      row.assigned_clinician_id,
      (loadByClinician.get(row.assigned_clinician_id) ?? 0) + 1,
    );
  }

  return clinicians.map((c) => ({
    id: c.id,
    name: `Dr. ${c.first_name} ${c.last_name}`,
    speciality: c.speciality ?? "General Medicine",
    load: loadByClinician.get(c.id) ?? 0,
    capacity: 12,
  }));
}

export type AdminCaseMetadata = {
  id: string;
  patientId: string;
  name: string;
  age: number;
  sex: "M" | "F";
  arrivedAt: string;
  waitingLabel: string | null;
  status: Case["status"];
  assignedTo: string | null;
};

export async function getAdminCaseMetadata(
  reportId: string,
): Promise<AdminCaseMetadata | null> {
  const supabase = await createClient();

  // Pull only metadata columns — never chief_complaint / soap_report /
  // ai_triage_label / confidence_score / referee_flags / encrypted_transcript.
  const { data: report } = await supabase
    .from("consultation_reports")
    .select(
      "id, patient_id, assigned_clinician_id, status, session_started_at, session_ended_at, created_at",
    )
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return null;

  const ids = [report.patient_id, report.assigned_clinician_id].filter(
    (id): id is string => Boolean(id),
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, date_of_birth, sex")
    .in("id", ids);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const patient = profileMap.get(report.patient_id);
  const clinician = report.assigned_clinician_id
    ? profileMap.get(report.assigned_clinician_id)
    : null;
  if (!patient) return null;

  const age = patient.date_of_birth
    ? differenceInYears(new Date(), parseISO(patient.date_of_birth))
    : 0;
  const sex: "M" | "F" = patient.sex?.toLowerCase().startsWith("f") ? "F" : "M";
  const arrivedAt = report.session_started_at ?? report.created_at;
  const waitingLabel = report.assigned_clinician_id
    ? null
    : report.session_ended_at
      ? `${differenceInMinutes(new Date(), parseISO(report.session_ended_at))}m`
      : "In session";

  return {
    id: report.id,
    patientId: report.patient_id,
    name: `${patient.first_name} ${patient.last_name}`,
    age,
    sex,
    arrivedAt,
    waitingLabel,
    status: report.status,
    assignedTo: clinician
      ? `Dr. ${clinician.first_name} ${clinician.last_name}`
      : null,
  };
}

export async function assignCaseAction(
  reportId: string,
  clinicianId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!reportId || !clinicianId) return { error: "Missing input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("consultation_reports")
    .update({
      assigned_clinician_id: clinicianId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath(`/admin/case/${reportId}`);
  return { ok: true };
}
