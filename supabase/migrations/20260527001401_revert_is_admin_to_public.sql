-- ============================================================================
-- Revert is_admin() back to public schema with default grants.
--
-- The previous hardening migration moved is_admin() to a private schema and
-- revoked EXECUTE from authenticated/anon. That broke RLS: a policy's
-- USING (private.is_admin()) needs the calling role to have EXECUTE on the
-- function. With it revoked, every SELECT on profiles (and consultation
-- reports) failed with "permission denied for function is_admin", breaking
-- the patient login/redirect flow.
--
-- Trade-off accepted: the function lives in public with default PUBLIC
-- EXECUTE again. Advisors will flag it as callable by anon/authenticated.
-- That's fine here — the function only returns whether the caller is admin
-- (returns false for anon since auth.uid() is null, and authenticated
-- callers already know their own role). No information leak.
-- ============================================================================

drop policy if exists "admins read all profiles" on public.profiles;
drop policy if exists "admins read consultation reports for queue"
  on public.consultation_reports;

drop function if exists private.is_admin();
drop schema if exists private;

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

create policy "admins read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "admins read consultation reports for queue"
  on public.consultation_reports for select
  to authenticated
  using (public.is_admin());
