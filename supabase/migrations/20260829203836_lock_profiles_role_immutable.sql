-- ============================================================================
-- lock_profiles_role_immutable
-- ============================================================================
-- "users insert own profile" and "users update own profile" only ever
-- checked auth.uid() = id -- neither restricted the role column. Verified
-- live (in a rolled-back transaction) that a plain patient's own JWT can
-- UPDATE their own row to role = 'admin' via a direct PostgREST call
-- (PATCH /rest/v1/profiles), completely bypassing the app. Once role is
-- 'admin', is_admin() returns true and unlocks every admin RLS policy.
--
-- role must only ever be set by the manual seeding process documented in
-- 20260526225926_seed_users.sql (direct SQL Editor / psql access, never
-- through the API). This locks it down at both entry points.
-- ============================================================================

-- 1. Self-registration can only ever create a patient row.
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id and role = 'patient');

-- 2. role can never change through any API-mediated UPDATE. anon,
-- authenticated, and service_role requests all flow through PostgREST and
-- have request.jwt.claims set to real content; a direct superuser session
-- (SQL Editor / psql, the documented seeding path) has it pre-declared but
-- empty ('', not null -- same reason auth.uid() itself uses nullif(...,'')
-- rather than a plain null check) and is unaffected.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and nullif(current_setting('request.jwt.claims', true), '') is not null
  then
    raise exception 'role cannot be changed through the API' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row
  execute function public.prevent_role_change();
