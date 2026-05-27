-- ============================================================================
-- save_consultation_transcript
-- ============================================================================
-- Companion to public.get_decrypted_transcript. The interview UI keeps the
-- in-progress chat in the browser (localStorage) so we avoid encrypting and
-- writing the row on every patient message. When the patient ends the
-- session, the transcript is sent once to this function which encrypts it
-- with pgp_sym_encrypt and transitions the report to 'awaiting_referee'.
--
-- The key is passed at call time from process.env.TRANSCRIPT_ENCRYPTION_KEY
-- and is never stored in the DB. Ownership + status are enforced inside the
-- function so a stolen reportId cannot end someone else's session and a
-- caller cannot end a session that is already abandoned, completed, or
-- awaiting downstream processing.
-- ============================================================================

create or replace function public.save_consultation_transcript(
  p_report_id uuid,
  p_transcript text,
  p_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  update public.consultation_reports
  set
    encrypted_transcript = extensions.pgp_sym_encrypt(p_transcript, p_key),
    session_ended_at = now(),
    status = 'awaiting_referee'
  where id = p_report_id
    and patient_id = auth.uid()
    and status = 'in_progress';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'session not found or no longer in progress'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.save_consultation_transcript(uuid, text, text)
  from public;
grant execute on function public.save_consultation_transcript(uuid, text, text)
  to authenticated;
