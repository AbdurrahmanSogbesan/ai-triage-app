# Project Status

Last updated: 2026-05-27 (Phase 3 close — full AI triage loop live)

## Current phase

**Phase 3 — The AI Triage Loop, end to end.** The dual-agent clinical workflow is real:

> patient registers → submits vitals → enters chief complaint → AI conducts a streamed interview → patient ends the session → encrypted transcript saved → SOAP generated (Gemini) → Referee scores (Groq) → admin assigns to a clinician → clinician reads SOAP + decrypted transcript on a real case-detail page → clinician confirms or overrides triage (with persisted notes) → status flips to `completed` → case moves to history.

No clinical surface still imports from mock data. `lib/data/mock-cases.ts` has been deleted; the only data path on every clinical surface is the live Supabase project.

## What's new since Phase 2

### AI pipeline

All AI logic lives under [`lib/ai/`](lib/ai/); the route handler / server actions only orchestrate.

- [`lib/ai/mts-charts.ts`](lib/ai/mts-charts.ts) — condensed Manchester Triage chart set (~10–12 most common OPD presentations). Paraphrased discriminators in plain language; a comment notes the production build would use the full 52-chart set.
- [`lib/ai/chart-selector.ts`](lib/ai/chart-selector.ts) — Stage 1 Chart Selector. Gemini 2.5 Flash via `generateObject` + Zod returning `{ chart, rationale }`. Runs once at session start.
- [`app/api/interview/chat/route.ts`](app/api/interview/chat/route.ts) — Stage 2 Interview Agent. Gemini 2.5 Flash via `streamText` + `convertToModelMessages`. System prompt is built from the selected chart's discriminators plus general red flags plus SOAP instructions. The first user turn is seeded with the chief complaint so the AI opens with a focused follow-up. `thinkingConfig.thinkingBudget = 0` is set — disabling Gemini's chain-of-thought saved 10× output tokens and dropped per-turn latency from ~9 s to ~3 s. Chart selector + SOAP keep thinking on, where deliberation actually helps.
- [`lib/ai/soap.ts`](lib/ai/soap.ts) — `generateSoapReport()` via Gemini 2.5 Flash + `generateObject` + Zod (`soapReportContentSchema` in [`lib/ai/schemas.ts`](lib/ai/schemas.ts)). Retry once on validation failure. Server stamps metadata (`model`, `generated_at`, `language_used`) — the model never writes its own metadata.
- [`lib/ai/referee.ts`](lib/ai/referee.ts) — `runReferee()` via Groq **`openai/gpt-oss-120b`** + `generateObject`. The Phase 3 handoff said Llama 3.3 70B, but that Groq model doesn't support `response_format: json_schema`; gpt-oss-120b is still a different model family from Gemini, preserving the independent-critique rationale. Temperature 0.2.
- [`lib/ai/prompts.ts`](lib/ai/prompts.ts) — `buildInterviewSystemPrompt`, `buildSoapSystemPrompt`, `buildRefereeSystemPrompt`, `formatTranscriptForPrompt`. Includes the no-filler rule, priority-cluster rule, cluster-pivot rule, and a TURN A / TURN B split so the model never narrates "I will now provide the closing message" into the patient-facing output.
- [`lib/ai/usage-log.ts`](lib/ai/usage-log.ts) — token + USD cost logging helper, wired into all four AI call sites. Realistic burn: ~$0.012 per session.

### Sync Referee, async-ready

The Referee runs **synchronously inline** in the end-session flow rather than via pgmq + pg_cron + Edge Function. This was a deliberate Phase 3 simplification — the async queue is a production scalability concern that adds hours of fragile infra for zero demo benefit. All Referee logic is isolated to one module exposing `runReferee(reportId: string)`; the future async migration is purely a wrapper change (Deno Edge Function calls the same logic), not a rewrite.

Patient flow uses Next.js `after()` to run the SOAP-then-Referee pipeline after the response is sent — the patient lands on the dashboard immediately with a "Verifying" pill that flips to "In review" within ~15 s.

The pipeline does **two-stage persistence**: SOAP `UPDATE` lands as soon as Gemini returns, then Referee runs inside a try/catch. If Referee fails (Groq rate limit, etc.), SOAP stays persisted and the case-detail page renders a `confidence_score = 0` "Manual review recommended" band.

### End-of-session flow

- Migration: [`supabase/migrations/20260527100000_save_consultation_transcript.sql`](supabase/migrations/20260527100000_save_consultation_transcript.sql) — SECURITY DEFINER `save_consultation_transcript(p_report_id, p_transcript, p_key)` that encrypts via `pgp_sym_encrypt`, sets `encrypted_transcript` + `session_ended_at`, and transitions status to `awaiting_referee`. Ownership and status checks live inside the function.
- [`endSessionAction`](<app/(patient)/patient/_components/actions.ts>) — reads `TRANSCRIPT_ENCRYPTION_KEY` from `process.env`, RPCs `save_consultation_transcript`, returns success, then schedules `runAiPipeline` via `after()`.
- Transcript is held in **client localStorage** during the interview (`triage:transcript:<reportId>`) so the chat survives page refresh, dashboard navigation, and multi-day sessions. On End Session the client posts the full transcript to the server which encrypts it; the localStorage key is cleared on success.

### Clinical surfaces — all real

- **Patient dashboard** ([`app/(patient)/patient/page.tsx`](<app/(patient)/patient/page.tsx>)) — greeting, summary card, in-progress card, quick-action tiles, recent sessions table. All from `getMyPatientProfile`, `getInProgressSession`, `getRecentSessions`, `getPatientSessionStats` in [`actions.ts`](<app/(patient)/patient/_components/actions.ts>).
- **Patient sessions** ([`app/(patient)/patient/sessions/page.tsx`](<app/(patient)/patient/sessions/page.tsx>)) — real session list.
- **In-progress card** — abandon flow real (clears localStorage transcript on success), continue restores chat from localStorage.
- **Vitals modal** — `hasVitalsToday` is now a real query against `vital_records` for the current calendar day. `submitVitalsAction` is idempotent — `UPDATE`s today's row if present, else `INSERT`s.
- **Interview view** ([`app/(patient)/patient/interview/[reportId]/_components/interview-view.tsx`](<app/(patient)/patient/interview/[reportId]/_components/interview-view.tsx>)) — AI SDK v6 `useChat`, localStorage persistence, end-session toast.
- **Admin queue** ([`app/(admin)/admin/page.tsx`](<app/(admin)/admin/page.tsx>) + [`_components/admin-queue.tsx`](<app/(admin)/admin/_components/admin-queue.tsx>)) — real queue from `admin_queue_view`, real clinician roster with load counts, real assignment (`useTransition` + `router.refresh()`), refresh button wired, status pill reflects actual `row.status`. No clinical content selected for admin role.
- **Admin case detail** ([`app/(admin)/admin/case/[reportId]/page.tsx`](<app/(admin)/admin/case/[reportId]/page.tsx>)) — metadata only, no clinical columns selected.
- **Clinician dashboard** ([`app/(clinician)/clinician/page.tsx`](<app/(clinician)/clinician/page.tsx>) + [`_components/clinician-dashboard.tsx`](<app/(clinician)/clinician/_components/clinician-dashboard.tsx>)) — assigned active cases (`status != 'completed'`).
- **Clinician case detail** ([`app/(clinician)/clinician/case/[reportId]/page.tsx`](<app/(clinician)/clinician/case/[reportId]/page.tsx>) + [`case-detail-view.tsx`](<app/(clinician)/clinician/case/[reportId]/_components/case-detail-view.tsx>)) — real report + decrypted transcript (via `get_decrypted_transcript`) + real audit trail built from DB timestamps (`session_started_at`, `session_ended_at`, SOAP `metadata.generated_at`, Referee `evaluated_at`, `reviewed_at`).
- **Clinician history** ([`app/(clinician)/clinician/history/page.tsx`](<app/(clinician)/clinician/history/page.tsx>) + [`_components/clinician-history.tsx`](<app/(clinician)/clinician/history/_components/clinician-history.tsx>)) — real list of completed cases ordered by `reviewed_at desc`, "Overrode AI" badge when the clinician label differs from the AI label, click-through to the existing case-detail page which renders the completed state.
- **SOAP rendering** ([`soap-panel.tsx`](<app/(clinician)/clinician/case/[reportId]/_components/soap-panel.tsx>)) consumes the canonical SOAP shape (`subjective.chief_complaint`, `subjective.history_of_present_illness`, etc.). The Phase-1 abbreviated `cc`/`hpi` shape is gone. `formatBloodPressure` helper strips a trailing "mmHg" before re-appending it (the model emits both formats); `nonEmpty` helper hides the empty-string `social_history` case.

### Override commit + clinician notes

- [`commitCaseReviewAction(reportId, level, notes)`](<app/(clinician)/clinician/_components/actions.ts>) writes `clinician_triage_label` + `clinician_notes` + `reviewed_at`, flips status to `completed`. Idempotent — the `WHERE status != 'completed'` filter makes replays a no-op.
- Migration: [`20260527130000_consultation_reports_clinician_notes.sql`](supabase/migrations/20260527130000_consultation_reports_clinician_notes.sql) adds the `clinician_notes text` column. The override form was always collecting a reason (10+ chars required when overriding); until this migration the server discarded it.
- The override side rail's audit trail uses real DB timestamps via `formatDistanceToNow`.

### Completed-case detail UX

The case-detail view now treats completed cases as historical records:

- Back link points to `/clinician/history` (not `/clinician`) with label "History".
- The waiting-time chip is replaced with `Reviewed Xh ago` (from `reviewed_at`).
- The vitals "Taken Xh ago" chip is omitted — the values themselves are framed by "Vitals on arrival" and the relative time is meaningless on an archived case.
- The override tab body becomes a "Case completed" card that surfaces the clinician's persisted note, with the audit trail beside it on desktop. The "When to override" tips card is hidden (moot once closed).
- The transcript tab shows a "Transcript sealed" empty state, since `get_decrypted_transcript` deliberately blocks the assigned clinician from decrypting once `status = 'completed'` — the encrypted bytes are preserved for audit but no longer readable from this view.

### Database changes since Phase 2

Four migrations on top of the Phase 2 initial schema:

1. [`20260527090000_patients_update_own_reports.sql`](supabase/migrations/20260527090000_patients_update_own_reports.sql) — patient UPDATE policy on `consultation_reports`. Without this, `mts_chart_selected` writebacks and end-of-session updates were silently dropped by RLS.
2. [`20260527100000_save_consultation_transcript.sql`](supabase/migrations/20260527100000_save_consultation_transcript.sql) — SECURITY DEFINER `save_consultation_transcript` helper described above.
3. [`20260527110000_admins_assign_clinicians.sql`](supabase/migrations/20260527110000_admins_assign_clinicians.sql) — `admins assign clinicians` UPDATE policy.
4. [`20260527120000_clinician_read_assigned_patients.sql`](supabase/migrations/20260527120000_clinician_read_assigned_patients.sql) — `clinicians read assigned patient profiles` policy + replaces the vitals SELECT policy with a status-agnostic version. Without this, `getAssignedCases` returns "Unknown patient" rows and case detail 404s.
5. [`20260527130000_consultation_reports_clinician_notes.sql`](supabase/migrations/20260527130000_consultation_reports_clinician_notes.sql) — adds `clinician_notes text` to persist the override rationale.

All five have been pushed to the live project. Regenerated types in [`types/database.ts`](types/database.ts) (the `clinician_notes` column was hand-edited per the documented workaround for the regen PAT requirement).

### Status enum UX

Pure label/tone changes in [`lib/types.ts`](lib/types.ts) `STATUS_META`:

- `awaiting_referee` → "Verifying" (`warn` / amber)
- `awaiting_clinician` → "In review" (`review` / violet — new tone added to [`status-badge.tsx`](components/clinical/status-badge.tsx))
- All five session statuses now have distinct colours.

### Shared utilities

- [`lib/utils.ts`](lib/utils.ts) exports `shortReportId(reportId)` → `R-XXXXXXXX` (8 hex upper) and `shortPatientId(patientId)` → `P-XXXX` (4 hex upper). Replaces the inline id-truncation snippets that used to live in four places.

### Privacy + self-service copy

- [`/privacy`](<app/(public)/privacy/page.tsx>) "Storage and processing" section rewritten to explain localStorage-in-progress + encrypted-on-end + personal-device recommendation.
- All "nurse takes vitals" copy removed. The vitals modal now describes the clinic's self-check station.

## Phase 3 conventions baked in

- **All AI calls server-side.** API keys never reach the browser. Chart Selector, SOAP, Referee, and the interview stream are all server-only.
- **Structured outputs via `generateObject` + Zod**, not string parsing. Retry once on schema-validation failure, then fail gracefully.
- **AI logic isolated from invocation.** Modules under `lib/ai/` do the work; route handlers / actions orchestrate. This is what makes the future async-Referee migration a wrapper change rather than a rewrite.
- **AI SDK v6 idioms only.** `streamText` + `convertToModelMessages` on the server, `useChat` from `@ai-sdk/react` on the client. No v4 patterns (`input` state on the hook, `content` strings, `append`, `maxSteps`).
- **PII boundary at the LLM call.** Prompts receive chief complaint + derived age + sex + vitals + chart catalogue. Never name, email, DOB, UUID, or contact info. The Stage 2 prompt explicitly tells the model not to ask for identifiers.
- **No multi-turn rules in chat prompts.** Multi-turn flows are split into TURN A / TURN B rules plus an explicit OUTPUT FORMAT rule forbidding meta-narration. Without this discipline the model leaks `"I will now provide the final closing message"` into the patient-facing output.
- **No inline arrow handlers in JSX.** Multi-line async/event handlers are extracted to named functions above the `return`.
- **Reference the design code first.** [`Project Design - AI Triage (2)/`](../Project Design - AI Triage (2)/) is the visual source of truth; the shadcn primitives are styled to match the prototype pixel-for-pixel (which is why arbitrary Tailwind class values like `max-w-[1280px]` are kept instead of canonical shorthands).
- **No doc-section refs in code.** No `§4` / "see spec X" / chapter pointers in code or SQL comments. Comments are self-contained.

## Build state

- `pnpm build`: clean, 17 routes (the public + auth + three role surfaces + interview chat API + new clinician history page).
- `pnpm tsc --noEmit`: 0 errors.
- `pnpm lint`: 0 errors, 2 pre-existing warnings (RHF `watch()` React Compiler note in [`start-triage-flow.tsx`](<app/(patient)/patient/_components/start-triage-flow.tsx>); `aria-pressed` on a `role=tab` in [`admin-queue.tsx`](<app/(admin)/admin/_components/admin-queue.tsx>)). Neither is new.

## Environment

`.env.local` keys (all server-only except the two `NEXT_PUBLIC_*`):

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
TRANSCRIPT_ENCRYPTION_KEY=
```

`TRANSCRIPT_ENCRYPTION_KEY` must be ≥32 chars (it's the `pgp_sym_encrypt` key). Rotating it makes existing encrypted transcripts undecryptable — don't rotate without a re-encrypt path.

## What's still pending

- **Demo seed** — deliberately skipped. The user keeps a handful of real test cases on the live DB; the dashboards are populated without a seed script.
- **`/admin/case/[reportId]`** is intentionally metadata-only. A reassignment-from-here action could be added but isn't required for the demo.
- **Override-failure path** — if the AI pipeline fails after the transcript saves, the row sits at `awaiting_referee` with `soap_report = null` and the clinician page shows "Summary not ready". The manual recovery is to start a fresh session; no automated regenerate-SOAP path yet.
- **Phase 4 items** (out of scope for Phase 3): Web Speech API STT (the mic button is still a visual stub), the evaluation harness against the synthetic case set, the optional async-pgmq + Edge Function Referee migration if scale demands.

## Test fixtures

- **Patient**: `bf33725e-65e4-43d4-a6eb-87ad82841932` — John Dosunmu (`jdosunmu@gmail.com`)
- **Clinician**: `10c58ef4-7f57-4d08-aa75-b72890804b4d` — Dr. Ifeoma Okafor (`i.okafor@sunshine.med.ng`)
- **Admin**: `863a39eb-a874-4d64-8a82-4c16c02cf61e` — `a.nwosu@sunshine.admin.ng`

QA notes:

- [QA_PHASE_3_SOAP.md](QA_PHASE_3_SOAP.md) — canonical acute-appendicitis scenario through the Abdominal Pain chart. Chest pain + thunderclap headache scenarios also land Orange / 92 confidence cleanly.

## Where the new things live

- AI: [`lib/ai/`](lib/ai/) — `chart-selector.ts`, `soap.ts`, `referee.ts`, `prompts.ts`, `mts-charts.ts`, `schemas.ts`, `usage-log.ts`
- Interview chat API: [`app/api/interview/chat/route.ts`](app/api/interview/chat/route.ts)
- Patient actions: [`app/(patient)/patient/_components/actions.ts`](<app/(patient)/patient/_components/actions.ts>)
- Admin actions: [`app/(admin)/admin/_components/actions.ts`](<app/(admin)/admin/_components/actions.ts>)
- Clinician actions: [`app/(clinician)/clinician/_components/actions.ts`](<app/(clinician)/clinician/_components/actions.ts>)
- Clinician history: [`app/(clinician)/clinician/history/`](<app/(clinician)/clinician/history/>)
- Migrations: [`supabase/migrations/`](supabase/migrations/) (8 total — three from Phase 2, five from Phase 3)
- Phase 3 handoff archive: [`PHASE_3B_HANDOFF.md`](PHASE_3B_HANDOFF.md) (live-coding session record)
