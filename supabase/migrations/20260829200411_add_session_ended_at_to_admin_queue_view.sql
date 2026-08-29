-- ============================================================================
-- add_session_ended_at_to_admin_queue_view
-- ============================================================================
-- The admin queue's "waiting" time was computed from created_at, which in
-- practice is set the instant the row is created (session start), not when
-- the AI actually finished with the patient. session_ended_at is the real
-- "AI chat completed" moment and is non-clinical (a timestamp, not content),
-- so it's safe to add to this column-restricted view alongside the existing
-- fields. security_invoker stays on; no RLS/grant changes needed.
-- ============================================================================

create or replace view public.admin_queue_view
with (security_invoker = true)
as
select
  cr.id,
  cr.patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  cr.ai_triage_label,
  cr.confidence_score,
  cr.status,
  cr.assigned_clinician_id,
  cr.created_at,
  cr.session_ended_at
from public.consultation_reports cr
join public.profiles p on p.id = cr.patient_id
where cr.status in ('awaiting_referee', 'awaiting_clinician', 'in_progress');

grant select on public.admin_queue_view to authenticated;
