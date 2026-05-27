# Project Status

Last updated: 2026-05-27 (post-validation prep)

## Current phase

**Phase 2 — Supabase Foundation + Real Auth + Profiles.** The full DB schema (with RLS, encryption function, admin queue view) is applied to the live Supabase project; real Supabase Auth replaces the mock cookie; the three profile surfaces and sidebar user displays read from the real `profiles` table. Clinical surfaces (dashboards, case detail, interview) intentionally still render Phase 1 mock data — they get wired in Phase 3 along with the intake flow.

## What's new in Phase 2

### Supabase

- **DB schema applied** to project `ybtzcgonhepcwdszndsa`. Three migrations:
  - [`20260526221158_initial_schema.sql`](supabase/migrations/20260526221158_initial_schema.sql) — `profiles`, `vital_records`, `consultation_reports`; enums (`user_role`, `triage_level`, `session_status`); RLS policies on every table; `pgcrypto` extension; `get_decrypted_transcript(report_id, key)`; `admin_queue_view`. Includes a `last_activity_at` column on `consultation_reports` for the Phase 3 timeout worker, and a `private.is_admin()` SECURITY DEFINER helper used by the admin RLS policies (kept out of `public` so PostgREST never exposes it).
  - [`20260526225509_harden_security_definer.sql`](supabase/migrations/20260526225509_harden_security_definer.sql) — fixup that moved `is_admin()` into the `private` schema and explicitly revoked `anon` from `get_decrypted_transcript`. Triggered by Supabase advisors flagging both as callable by `anon` even after `revoke from public` (anon/authenticated have separate default grants on `public.*`).
  - [`20260526225926_seed_users.sql`](supabase/migrations/20260526225926_seed_users.sql) — no-op tracker; the actual clinician + admin seeding is a manual dashboard step documented at the top of the file. Patients self-register through `/register`.
- **Types** generated to [`types/database.ts`](types/database.ts) via `supabase gen types`. Imported wherever Supabase is touched. Regenerate after every migration.
- **Supabase clients** live in [`lib/supabase/server.ts`](lib/supabase/server.ts) (server-side, bound to `cookies()`) and [`lib/supabase/client.ts`](lib/supabase/client.ts) (browser).

### Auth

- [`proxy.ts`](proxy.ts) — rewritten to refresh the Supabase session cookie on every matched request, redirect unauthenticated traffic from `/patient|/clinician|/admin` to `/login`, and bounce authed traffic away from `/login`/`/register` to `/`. **Patient-vs-clinician role gating is no longer done in the proxy** — it moved into each role's layout (see below) so the proxy stays DB-free.
- [`app/(auth)/actions.ts`](app/(auth)/actions.ts) — `login`, `register`, and `signOut` server actions calling `supabase.auth.signInWithPassword` / `signUp` / `signOut`. `register` inserts the `profiles` row right after `signUp`; failures surface to the form via toast. After successful login, the action reads the user's role and redirects to the correct role root.
- [`lib/auth/session.ts`](lib/auth/session.ts) — `getSessionProfile()` returns `{ user, profile }` or `null`. Single DB hit per request, used by layouts (role gate + sidebar) and the root page.
- [`lib/auth/roles.ts`](lib/auth/roles.ts) — new home for the pure `roleRoot()` helper. The old `lib/auth/mock.ts` is deleted; no `mock-role` cookie logic, no `roleFromEmail`, no `MOCK_COOKIE` references remain in the codebase.

### Role layouts now gate by role

- [`app/(patient)/patient/layout.tsx`](app/(patient)/patient/layout.tsx), [`app/(clinician)/clinician/layout.tsx`](app/(clinician)/clinician/layout.tsx), [`app/(admin)/admin/layout.tsx`](app/(admin)/admin/layout.tsx) — each is now an async server component that calls `getSessionProfile()`, redirects to `/login` if no session, redirects to the correct role root if the role doesn't match, then passes the real profile name + a role-specific subtitle (department/MDCN for clinician, department for admin, email for patient) into `RoleShell`. One profile fetch covers both the role check and the sidebar user display.

### Profile surfaces

- The three `/patient/profile`, `/clinician/profile`, `/admin/profile` pages now fetch `getSessionProfile()` server-side and render the live `profiles` row via the existing `ProfileScreen`. Field shape is mapped at the page level — no changes to `ProfileScreen`'s prop types beyond adding an optional `children` slot.
- **Patient clinical-baseline editor** — [`app/(patient)/patient/profile/_components/baseline-editor.tsx`](app/(patient)/patient/profile/_components/baseline-editor.tsx) is a `react-hook-form` + `standardSchemaResolver` form (same pattern as login/register) with selects for `blood_group`, `genotype` and an input for `preferred_language`. The zod schema lives in [`lib/schemas/profile.ts`](lib/schemas/profile.ts) so server and client share it. Save calls [`updatePatientBaseline`](app/(patient)/patient/profile/actions.ts), which RLS-scopes the update to the caller's own row and `revalidatePath`s `/patient/profile`; the client then `router.refresh()`es so the read-only display above re-fetches. Toasts on success and error. The editor narrows DB `text | null` to the enum union at its boundary so a column value outside the allowed set falls back to "Not specified" rather than crashing the form.

### Sign-out + welcome toast

- `RoleShell` sign-out now calls the `signOut` server action (which redirects to `/login`), replacing the mock cookie-clear.
- The Phase 1 register-success toast was moved into [`WelcomeToast`](app/(patient)/patient/_components/welcome-toast.tsx) — register redirects to `/patient?welcome=1`, the toast component fires once on mount and strips the query param. This preserves the Phase 1 toast trigger without coupling it to the (now-redirecting) server action.

## Phase 2 conventions baked in

- **Generated DB types are canonical at the data boundary.** Server code reads/writes `Database`-typed rows via the `Tables<>`/`Enums<>` shorthands; pages adapt to the UI types at the component boundary. No file uses the long-form `Database["public"]["Tables"][…]["Row"]` access.
- **Schemas are colocated with the data they validate, not the action.** Zod schemas live in `lib/schemas/*` so server actions and client forms can both import them. `auth.ts`, `clinical.ts`, `profile.ts` are the current set.
- **RLS is the security boundary, not the UI.** Layout redirects are a UX nicety; the policies in the initial schema migration independently prevent cross-account reads. Patient A's session cannot read Patient B's `profiles` row even if A bypasses the UI.
- **Service role key and `TRANSCRIPT_ENCRYPTION_KEY` never reach the browser.** They only appear in `.env.local` and are read only inside server actions / the migration. No client component imports them.
- **`SECURITY DEFINER` helpers that aren't called by application code live in the `private` schema.** Keeps them out of the auto-exposed PostgREST surface and out of advisor warnings.
- **`import "server-only"` marker** on `lib/supabase/server.ts` and `lib/auth/session.ts` — fails the build at the import boundary if a client component reaches for them.

## Advisor state

Last `supabase db advisors --linked` run: **4 WARN, 0 ERROR.** All four are deliberate-or-deferred:

- **`get_decrypted_transcript` callable by `authenticated`** — intentional. Phase 3 server actions need to call it via `supabase.rpc()`. RLS inside the function still enforces "patient self OR active assigned clinician."
- **3 × multiple permissive policies on SELECT** (`profiles`, `vital_records`, `consultation_reports`) — perf hint at tiny row counts. Combining the role-specific SELECT policies into one OR'd policy each is a Phase 3+ cleanup, not blocking.

## What's still on mock data (unchanged from Phase 1)

All clinical surfaces still import from [`lib/data/mock-cases.ts`](lib/data/mock-cases.ts):

- `/patient` dashboard (in-progress card, recent sessions table)
- `/patient/sessions` past sessions list
- `/patient/interview/[reportId]` chat UI
- `/clinician` dashboard case list
- `/clinician/case/[reportId]` SOAP + transcript + override
- `/clinician/history`
- `/admin` queue + stat cards + clinician-load rail
- `/admin/case/[reportId]` metadata view

A logged-in clinician seeing mock cases that don't correspond to any real `consultation_reports` rows is expected for Phase 2 — these surfaces get wired in Phase 3 alongside the real intake flow.

## Routes (all still live)

15 routes, same as Phase 1, but most role-grouped pages flipped from static to dynamic in the build output because their layouts now run a per-request profile fetch.

## Where the new things live

- Supabase clients: [`lib/supabase/server.ts`](lib/supabase/server.ts), [`lib/supabase/client.ts`](lib/supabase/client.ts)
- Auth helpers: [`lib/auth/session.ts`](lib/auth/session.ts), [`lib/auth/roles.ts`](lib/auth/roles.ts)
- Auth actions: [`app/(auth)/actions.ts`](app/(auth)/actions.ts) (`login`, `register`, `signOut`)
- Profile editor: [`app/(patient)/patient/profile/actions.ts`](app/(patient)/patient/profile/actions.ts), [`app/(patient)/patient/profile/_components/baseline-editor.tsx`](app/(patient)/patient/profile/_components/baseline-editor.tsx), schema in [`lib/schemas/profile.ts`](lib/schemas/profile.ts)
- Welcome toast: [`app/(patient)/patient/_components/welcome-toast.tsx`](app/(patient)/patient/_components/welcome-toast.tsx)
- Generated types: [`types/database.ts`](types/database.ts)
- Migrations: [`supabase/migrations/`](supabase/migrations/)

## Supabase project state at end of Phase 2

- Email confirmation: **OFF** (Auth → Providers → Email → Confirm email). Necessary because the register action does `signUp` then inserts the profile row using the just-created session; with confirmation on, signUp returns no session and the insert fails RLS. Documented limitation for the thesis prototype.
- Seeded accounts (real `auth.users` + `public.profiles` rows): `i.okafor@sunshine.med.ng` (clinician, `10c58ef4-7f57-4d08-aa75-b72890804b4d`) and `a.nwosu@sunshine.admin.ng` (admin, `863a39eb-a874-4d64-8a82-4c16c02cf61e`).

## Known gaps / Phase 3 TODOs

Inherited from Phase 1, plus new items:

- **SOAP shape reconciliation (Phase 3).** [`lib/types.ts`](lib/types.ts) `SoapReport` uses abbreviated keys (`cc`, `hpi`, `pmh`, `meds`…). The canonical LLM-output SOAP JSON (`subjective.chief_complaint`, `subjective.history_of_present_illness`, `subjective.past_medical_history: string[]`, etc.) is materially different. When the real Gemini output starts flowing, either map at the data boundary or replace `lib/types.ts` `SoapReport` with the canonical shape. Mock-driven UI is unaffected for Phase 2.
- **Multiple permissive RLS SELECT policies** — combine into single OR'd policies on `profiles`, `vital_records`, `consultation_reports` once row counts are non-trivial.
- **Clinician/admin sign-out** is hooked to the real `signOut` action, but there is no "are you sure?" confirm dialog. Phase 1 didn't have one either; flagged in case it's wanted.
- Carryover from Phase 1: the interview "Continue" path still routes to `R-2041`; refresh + export PDF + audit-trail are still stubs; `hasVitalsToday` skip-logic still not implemented.

## Build state

- `pnpm build`: clean, 15 routes
- `pnpm lint`: 0 errors, 2 informational warnings carried over from Phase 1 (RHF `watch()` React Compiler note in `start-triage-flow.tsx`, `aria-pressed` on a `role=tab` in `admin-queue.tsx`). No new warnings.
- Three migrations applied to the live project; advisors at 4 WARN, 0 ERROR (all explained above).
