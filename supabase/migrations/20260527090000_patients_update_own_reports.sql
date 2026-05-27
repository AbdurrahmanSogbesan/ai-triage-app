-- ============================================================================
-- patients_update_own_reports
-- ============================================================================
-- The initial schema granted patients SELECT + INSERT on consultation_reports
-- but not UPDATE. The interview chat route caches the selected MTS chart on
-- the row after the first message, and end-of-session flows set status,
-- session_ended_at, encrypted_transcript, and soap_report — all running under
-- the patient's JWT. Without an UPDATE policy these writes are silently
-- dropped by RLS (PostgREST returns 0 rows affected, no error).
--
-- Column-level scoping (patients should not touch assigned_clinician_id,
-- clinician_triage_label, or reviewed_at) is enforced in application code;
-- the policy itself only checks row ownership.
-- ============================================================================

create policy "patients update own reports"
  on public.consultation_reports for update
  to authenticated
  using ((select auth.uid()) = patient_id)
  with check ((select auth.uid()) = patient_id);
