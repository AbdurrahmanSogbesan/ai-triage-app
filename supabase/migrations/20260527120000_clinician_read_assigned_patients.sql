-- ============================================================================
-- clinician_read_assigned_patients
-- ============================================================================
-- The initial schema gave patients SELECT on their own profile and admins
-- SELECT on all profiles, but missed the case where an assigned clinician
-- needs to read the assigned patient's profile (name, age, sex) to populate
-- their dashboard and case-detail view. Without this policy the join in
-- getAssignedCases returns null, the dashboard shows "Unknown patient", and
-- the case-detail server component 404s on `if (!patient || !vital)`.
--
-- The matching vital_records policy already exists but it filters by
-- `status != 'completed'`, which breaks the case-detail page the moment the
-- clinician marks the case done (the same page they just submitted from).
-- We replace it with a status-agnostic version so a clinician can re-open
-- a case they've just completed without the page falling apart.
--
-- Both policies use the same predicate: read access is gated on "this
-- clinician is the assigned clinician for at least one consultation report
-- referencing this profile/vital". Once unassigned, access falls away.
-- ============================================================================

create policy "clinicians read assigned patient profiles"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.consultation_reports cr
      where cr.patient_id = profiles.id
        and cr.assigned_clinician_id = auth.uid()
    )
  );

drop policy if exists "assigned clinicians read patient vitals"
  on public.vital_records;

create policy "assigned clinicians read patient vitals"
  on public.vital_records for select
  to authenticated
  using (
    exists (
      select 1 from public.consultation_reports cr
      where cr.patient_id = vital_records.patient_id
        and cr.assigned_clinician_id = auth.uid()
    )
  );
