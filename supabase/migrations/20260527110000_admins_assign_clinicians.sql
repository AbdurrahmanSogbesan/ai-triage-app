-- ============================================================================
-- admins_assign_clinicians
-- ============================================================================
-- Admins manage the queue by setting consultation_reports.assigned_clinician_id.
-- Without this UPDATE policy, the assignment server action would silently
-- fail (the existing SELECT policy lets the admin read the row, but RLS
-- denies the UPDATE so PostgREST returns 0 rows affected with no error).
--
-- Column-level scoping (admins should only touch assigned_clinician_id, not
-- clinical fields) is enforced in application code — the assignCaseAction
-- server action only ever sends that one column.
-- ============================================================================

create policy "admins assign clinicians"
  on public.consultation_reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
