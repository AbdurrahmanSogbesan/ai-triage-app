-- ============================================================================
-- add_consultation_reports_assigned_at
-- ============================================================================
-- Admins had no way to know when a case was assigned to a clinician —
-- assignCaseAction only ever wrote assigned_clinician_id. The clinician
-- dashboard's "waiting" column used session_started_at instead, which
-- measures time since the patient started their interview, not time since
-- the case landed on this clinician's desk.
-- ============================================================================

alter table public.consultation_reports
  add column if not exists assigned_at timestamptz;
