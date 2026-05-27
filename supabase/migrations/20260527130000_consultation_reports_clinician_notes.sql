-- ============================================================================
-- consultation_reports_clinician_notes
-- ============================================================================
-- Adds a clinician_notes column to persist the free-text rationale a clinician
-- enters when committing a case review. Required for overrides (10+ chars
-- enforced client-side); optional otherwise. The override UI was always
-- collecting this value — until now the server silently discarded it.
-- ============================================================================

alter table public.consultation_reports
  add column if not exists clinician_notes text;
