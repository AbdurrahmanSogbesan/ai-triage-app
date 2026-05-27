import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { InterviewView } from "./_components/interview-view";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const supabase = await createClient();

  // RLS scopes consultation_reports to the owning patient and assigned
  // clinician, so an unauthorized caller gets back no row and 404s.
  const { data: report, error: reportError } = await supabase
    .from("consultation_reports")
    .select("id, chief_complaint, vital_record_id, patient_id")
    .eq("id", reportId)
    .maybeSingle();
  if (reportError || !report) notFound();

  const [{ data: patient }, { data: vital }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name")
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
  if (!patient || !vital) notFound();

  return (
    <InterviewView
      reportId={report.id}
      patientFirstName={patient.first_name}
      vitals={{
        bpSys: vital.blood_pressure_systolic,
        bpDia: vital.blood_pressure_diastolic,
        tempC: vital.temperature_celsius,
        weightKg: vital.weight_kg,
      }}
      complaint={report.chief_complaint}
    />
  );
}
