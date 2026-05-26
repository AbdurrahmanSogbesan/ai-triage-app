-- ============================================================================
-- Harden the two SECURITY DEFINER functions from the initial schema.
--
-- Why: `revoke all ... from public` on Supabase does NOT strip the `anon` and
-- `authenticated` roles — those roles have separate default EXECUTE grants on
-- everything in the `public` schema. So both functions were still callable by
-- anon via PostgREST RPC, which the advisor flagged.
--
-- Fixes:
--   1. Move `is_admin()` to a `private` schema so PostgREST never exposes it.
--      RLS policies that referenced `public.is_admin()` are updated.
--   2. Explicitly revoke `get_decrypted_transcript` from anon (the function
--      must stay in public so server actions can call it via .rpc()).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Move is_admin() to a private schema
-- ----------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Drop the old policies that reference public.is_admin().
drop policy if exists "admins read all profiles" on public.profiles;
drop policy if exists "admins read consultation reports for queue"
  on public.consultation_reports;

-- Drop the old public function.
drop function if exists public.is_admin();

create or replace function private.is_admin()
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

-- Default grants on schemas other than public don't add anon/authenticated,
-- so no roles can call this directly via PostgREST. RLS policy evaluation can
-- still resolve it because policies execute with the table owner's privileges.
revoke all on function private.is_admin() from public, anon, authenticated;

-- Recreate the policies pointing at the new function.
create policy "admins read all profiles"
  on public.profiles for select
  to authenticated
  using (private.is_admin());

create policy "admins read consultation reports for queue"
  on public.consultation_reports for select
  to authenticated
  using (private.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Tighten get_decrypted_transcript: explicit revoke from anon
-- ----------------------------------------------------------------------------

-- Stays in public because server actions invoke it via supabase.rpc(), which
-- requires the function to live in an API-exposed schema. Only `authenticated`
-- callers should be able to decrypt.
revoke execute on function public.get_decrypted_transcript(uuid, text)
  from anon, public;
grant execute on function public.get_decrypted_transcript(uuid, text)
  to authenticated;
