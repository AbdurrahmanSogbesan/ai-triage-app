-- ============================================================================
-- lock_patient_report_writes
-- ============================================================================
-- The "patients insert own reports" and "patients update own reports" policies
-- only check row ownership, and the Supabase URL + anon key are public, so a
-- patient holding their own session token could write any column of their
-- own reports straight through the API: their triage level, SOAP report,
-- confidence score, clinician notes, status, or a backdated created_at that
-- dodges the daily triage limit.
--
-- These triggers restrict what a patient can write directly:
--   INSERT: only a fresh in-progress session using their own vitals; the
--           timestamps are set here, not by the caller.
--   UPDATE: only caching the MTS chart during the interview, or abandoning
--           an in-progress session. Everything else is rejected, including
--           columns added later.
--
-- Writes that legitimately touch clinical columns don't run as the
-- `authenticated` role and are unaffected: SECURITY DEFINER functions run as
-- their owner (save_consultation_transcript), and the AI pipeline writes with
-- the service role. Clinicians and admins are never the patient on a report,
-- so their own update policies still govern them.
--
-- The functions are SECURITY INVOKER on purpose: current_user must be the
-- caller's role for the checks above to work.
-- ============================================================================

create or replace function private.guard_patient_report_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.patient_id is distinct from auth.uid() then
    raise exception 'reports can only be created for yourself' using errcode = '42501';
  end if;

  if new.status <> 'in_progress' then
    raise exception 'new reports must start in progress' using errcode = '42501';
  end if;

  -- RLS on vital_records only lets the patient see their own readings.
  if not exists (
    select 1 from public.vital_records
    where id = new.vital_record_id and patient_id = new.patient_id
  ) then
    raise exception 'vital record does not belong to this patient' using errcode = '42501';
  end if;

  new.created_at := now();
  new.session_started_at := now();
  new.last_activity_at := now();

  if exists (
    select 1
    from jsonb_each(
      to_jsonb(new) - array[
        'id', 'patient_id', 'vital_record_id', 'chief_complaint', 'status',
        'language_used', 'created_at', 'session_started_at', 'last_activity_at'
      ]
    )
    where value <> 'null'::jsonb
  ) then
    raise exception 'patients cannot set clinical fields on a new report' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function private.guard_patient_report_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_changed text[];
begin
  if current_user <> 'authenticated' or auth.uid() is distinct from old.patient_id then
    return new;
  end if;

  select coalesce(array_agg(n.key), '{}')
  into v_changed
  from jsonb_each(to_jsonb(new)) as n
  where n.value is distinct from (to_jsonb(old) -> n.key);

  if cardinality(v_changed) = 0 then
    return new;
  end if;

  -- The interview chat route caches the selected chart on the row.
  if v_changed <@ array['mts_chart_selected'] and old.status = 'in_progress' then
    return new;
  end if;

  -- The patient discards an in-progress session.
  if v_changed <@ array['status', 'session_ended_at']
     and old.status = 'in_progress'
     and new.status = 'abandoned' then
    return new;
  end if;

  raise exception 'patients cannot change % on this report', array_to_string(v_changed, ', ')
    using errcode = '42501';
end;
$$;

revoke all on function private.guard_patient_report_insert() from public, anon, authenticated;
revoke all on function private.guard_patient_report_update() from public, anon, authenticated;

create trigger consultation_reports_patient_insert_guard
  before insert on public.consultation_reports
  for each row execute function private.guard_patient_report_insert();

create trigger consultation_reports_patient_update_guard
  before update on public.consultation_reports
  for each row execute function private.guard_patient_report_update();
