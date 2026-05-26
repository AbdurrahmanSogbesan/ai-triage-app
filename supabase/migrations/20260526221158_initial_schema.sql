-- ============================================================================
-- Initial schema for the Outpatient Triage System.
--
-- Three tables (profiles, vital_records, consultation_reports), three enums,
-- RLS on every table, pgcrypto for transcript-at-rest, a SECURITY DEFINER
-- decryption helper, and a column-restricted view for the admin queue.
--
-- Phase 2 only exercises profiles + auth. Clinical tables are staged so the
-- next phase can start writing without a schema change.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type public.user_role as enum ('patient', 'clinician', 'admin');

create type public.triage_level as enum ('red', 'orange', 'yellow', 'green', 'blue');

create type public.session_status as enum (
  'in_progress',
  'abandoned',
  'awaiting_referee',
  'awaiting_clinician',
  'completed'
);

-- ----------------------------------------------------------------------------
-- Shared trigger helpers
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'patient',
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  preferred_language text default 'en',

  -- Patient clinical baseline. Nullable; collected via /patient/profile
  -- after signup, so the AI agents must tolerate these being null.
  date_of_birth date,
  sex text,
  blood_group text,
  genotype text,

  -- Clinician + admin role-specific. Seeded via SQL, not collected at signup.
  mdcn_number text,
  speciality text,
  department text,
  languages text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER helper so the "admins read all profiles" policy doesn't
-- self-recurse: a USING clause that selects from profiles triggers RLS again.
-- This function bypasses RLS internally and is only callable as auth.uid().
-- Execute is granted to authenticated only — anon has no use for it and
-- gets blocked at the privilege layer rather than relying on auth.uid() = null.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;

create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "admins read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- ============================================================================
-- vital_records
-- ============================================================================

create table public.vital_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  blood_pressure_systolic int not null
    check (blood_pressure_systolic between 50 and 250),
  blood_pressure_diastolic int not null
    check (blood_pressure_diastolic between 30 and 150),
  temperature_celsius numeric(4,2) not null
    check (temperature_celsius between 30 and 45),
  weight_kg numeric(5,2) not null
    check (weight_kg between 2 and 300),
  created_at timestamptz not null default now()
);

create index vital_records_patient_recorded_idx
  on public.vital_records(patient_id, recorded_at desc);

alter table public.vital_records enable row level security;

create policy "patients insert own vitals"
  on public.vital_records for insert
  to authenticated
  with check ((select auth.uid()) = patient_id);

create policy "patients read own vitals"
  on public.vital_records for select
  to authenticated
  using ((select auth.uid()) = patient_id);

-- The "assigned clinicians read patient vitals" policy is defined below,
-- after consultation_reports exists (it references that table in EXISTS).

-- ============================================================================
-- consultation_reports
-- ============================================================================

create table public.consultation_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  vital_record_id uuid not null references public.vital_records(id),
  assigned_clinician_id uuid references public.profiles(id),
  chief_complaint text not null,
  mts_chart_selected text,
  language_used text default 'en',
  status public.session_status not null default 'in_progress',
  encrypted_transcript bytea,
  soap_report jsonb,
  ai_triage_label public.triage_level,
  clinician_triage_label public.triage_level,
  confidence_score int check (confidence_score between 0 and 100),
  referee_flags jsonb,
  session_started_at timestamptz not null default now(),
  session_ended_at timestamptz,
  reviewed_at timestamptz,

  -- Updated on every interview message. A timeout worker reads this to mark
  -- idle sessions 'abandoned' after 10 minutes of inactivity. Worker is
  -- wired in a later phase; column exists now to avoid a schema migration.
  last_activity_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

create index consultation_reports_status_created_idx
  on public.consultation_reports(status, created_at);

create index consultation_reports_clinician_status_idx
  on public.consultation_reports(assigned_clinician_id, status);

create index consultation_reports_patient_created_idx
  on public.consultation_reports(patient_id, created_at desc);

-- FK column without an explicit index. Cascades from vital_records and any
-- join in that direction would seq-scan; cheap to index now while empty.
create index consultation_reports_vital_record_idx
  on public.consultation_reports(vital_record_id);

alter table public.consultation_reports enable row level security;

create policy "patients read own reports"
  on public.consultation_reports for select
  to authenticated
  using ((select auth.uid()) = patient_id);

create policy "patients insert own reports"
  on public.consultation_reports for insert
  to authenticated
  with check ((select auth.uid()) = patient_id);

create policy "assigned clinicians read assigned reports"
  on public.consultation_reports for select
  to authenticated
  using ((select auth.uid()) = assigned_clinician_id);

create policy "assigned clinicians update assigned reports"
  on public.consultation_reports for update
  to authenticated
  using ((select auth.uid()) = assigned_clinician_id)
  with check ((select auth.uid()) = assigned_clinician_id);

-- Admins can SELECT from the base table (RLS allows it), but server actions
-- MUST query admin_queue_view for admin queries so clinical columns never
-- leave the DB. The view is defense-in-depth; the server-action branching
-- is the primary control.
create policy "admins read consultation reports for queue"
  on public.consultation_reports for select
  to authenticated
  using (public.is_admin());

-- Deferred from the vital_records section above; defined here so the EXISTS
-- subquery against consultation_reports can resolve.
create policy "assigned clinicians read patient vitals"
  on public.vital_records for select
  to authenticated
  using (
    exists (
      select 1 from public.consultation_reports cr
      where cr.patient_id = public.vital_records.patient_id
        and cr.assigned_clinician_id = (select auth.uid())
        and cr.status != 'completed'
    )
  );

-- ============================================================================
-- Transcript decryption helper
-- ----------------------------------------------------------------------------
-- Writes call pgp_sym_encrypt inline from a server action. Reads go through
-- this function so the row access check (patient self OR active assigned
-- clinician) and the decryption happen atomically. The key is passed at
-- call time from process.env.TRANSCRIPT_ENCRYPTION_KEY; never stored in DB.
-- ============================================================================

create or replace function public.get_decrypted_transcript(report_id uuid, key text)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select extensions.pgp_sym_decrypt(encrypted_transcript, key)::text
  from public.consultation_reports
  where id = report_id
    and (
      patient_id = auth.uid()
      or (assigned_clinician_id = auth.uid() and status != 'completed')
    );
$$;

revoke all on function public.get_decrypted_transcript(uuid, text) from public;
grant execute on function public.get_decrypted_transcript(uuid, text) to authenticated;

-- ============================================================================
-- admin_queue_view
-- ----------------------------------------------------------------------------
-- Column-restricted view of in-flight cases for the admin queue. With
-- security_invoker = true the view evaluates RLS on the base tables as the
-- calling user, so admins see rows their RLS allows and patients/clinicians
-- effectively see nothing (their RLS would filter the join).
-- ============================================================================

create view public.admin_queue_view
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
  cr.created_at
from public.consultation_reports cr
join public.profiles p on p.id = cr.patient_id
where cr.status in ('awaiting_referee', 'awaiting_clinician', 'in_progress');

grant select on public.admin_queue_view to authenticated;
