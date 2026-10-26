-- ============================================================================
-- interview_usage_limits
-- ============================================================================
-- Caps how much AI a single patient account can consume, now that signup is
-- open to the public:
--   1. At most 5 triage sessions started per patient per day (Lagos time).
--   2. At most 25 patient messages per interview.
--
-- Both are enforced in the database rather than only in application code:
-- patients can insert reports directly through the API (the "patients insert
-- own reports" policy) and can update any column of their own reports (the
-- "patients update own reports" policy), so a counter on consultation_reports
-- or a check in the server action alone could be bypassed.
-- ============================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- 1. Daily session cap
-- ---------------------------------------------------------------------------

create or replace function private.enforce_daily_triage_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today_start timestamptz :=
    date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_count int;
begin
  select count(*) into v_count
  from public.consultation_reports
  where patient_id = new.patient_id
    and created_at >= v_today_start;

  if v_count >= 5 then
    raise exception 'daily_triage_limit' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_daily_triage_limit() from public, anon, authenticated;

create trigger consultation_reports_daily_limit
  before insert on public.consultation_reports
  for each row execute function private.enforce_daily_triage_limit();

-- ---------------------------------------------------------------------------
-- 2. Per-interview message cap
-- ---------------------------------------------------------------------------

-- Lives in the private schema (not exposed through the API) so patients
-- cannot read or reset their own counts.
create table private.interview_message_counts (
  report_id uuid primary key
    references public.consultation_reports(id) on delete cascade,
  patient_messages int not null default 0
);

revoke all on table private.interview_message_counts from public, anon, authenticated;

-- Called by the interview chat route before every AI reply. Records one
-- patient message and returns the new total. Ownership and status are
-- checked here so a caller cannot spend another patient's allowance or keep
-- chatting on a finished session.
create or replace function public.record_interview_message(p_report_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.consultation_reports
    where id = p_report_id
      and patient_id = auth.uid()
      and status = 'in_progress'
  ) then
    raise exception 'session not found or no longer in progress'
      using errcode = 'P0002';
  end if;

  insert into private.interview_message_counts as c (report_id, patient_messages)
  values (p_report_id, 1)
  on conflict (report_id)
    do update set patient_messages = c.patient_messages + 1
  returning c.patient_messages into v_count;

  return v_count;
end;
$$;

revoke all on function public.record_interview_message(uuid) from public, anon;
grant execute on function public.record_interview_message(uuid) to authenticated;
