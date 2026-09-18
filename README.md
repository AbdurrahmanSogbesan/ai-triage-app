# AI Triage

A dual-agent triage system for hospital outpatient departments.

A patient records their vitals and chief complaint, then is interviewed by a
conversational agent following a Manchester Triage System (MTS) chart picked
for their presentation. When the interview ends, the transcript is encrypted
and a **Primary Analyst** agent turns it into a structured SOAP report carrying
an MTS triage level. A second **Referee** agent — a different model, from a
different provider — independently audits that report against the transcript
and assigns a confidence score plus defect flags.

Neither agent's output reaches the patient. The case lands in a clinician's
queue ordered by urgency, and a clinician reads the report, accepts or
overrides the triage level with a written rationale, and only then sees the
patient. The AI shortens the clinician's read-in; it never makes the decision.

Three roles: **patients** self-register and complete interviews; **clinicians**
review cases and commit the final triage level; **administrators** see a
metadata-only queue and assign cases by caseload.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind v4
with shadcn/ui on Base UI · Supabase (Postgres, Auth, RLS, `pgcrypto` for
transcripts at rest) · Vercel AI SDK v6 · Gemini 2.5 Flash (interview, chart
selection, SOAP) · Groq `openai/gpt-oss-120b` (Referee).

## Setup

**Prerequisites:** Node 20.9+, pnpm 10+, a Supabase project, and API keys for
[Google AI Studio](https://aistudio.google.com/apikey) and
[Groq](https://console.groq.com/keys). Optionally the
[Supabase CLI](https://supabase.com/docs/guides/local-development) for migrations.

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, the anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. Bypasses RLS — server-side only |
| `TRANSCRIPT_ENCRYPTION_KEY` | Generate one: `openssl rand -base64 48`. Lose it and existing transcripts can't be decrypted |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio |
| `GROQ_API_KEY` | Groq Console |
| `DISABLE_SESSION_TIMEOUT` | Leave blank; `true` in dev only, to stop `proxy.ts` logging you out |

Apply the migrations — they build the schema, the RLS policies for all three
roles, and the transcript encryption helpers:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Registration creates patients only. Create staff accounts with:

```bash
pnpm create-staff -- --role=clinician --email=... --password=... \
  --first-name=... --last-name=... --speciality="General Practice"
```

Then `pnpm dev` and open <http://localhost:3000>. You'll be routed to
`/patient`, `/clinician` or `/admin` based on your profile's role.

## Layout

```
lib/ai/              Both agents: chart selection, prompts, SOAP, Referee, schemas
app/(patient)/       Intake, interview UI, session history
app/(clinician)/     Case queue, SOAP/transcript review, triage override
app/(admin)/         Metadata-only queue, clinician assignment
app/api/interview/   Streaming chat route for the interview
evaluation/          Offline harness that scores the pipeline
supabase/migrations/ Schema, RLS policies, encryption helpers
proxy.ts             Auth cookie refresh, route guards, session timeouts
```

## Evaluation

Twenty synthetic cases run through the real pipeline headlessly — no browser,
no database — with an LLM playing the patient, given only the persona and never
the expected answer.

```bash
pnpm evaluate                          # writes evaluation/results/<timestamp>/
pnpm evaluate:metrics --run <timestamp> # scores it: summary.json + report.md
```

Reports chart-selection accuracy, triage accuracy with separate over- and
under-triage rates, a confusion matrix, symptom and red-flag capture, and
whether the Referee's confidence bands actually predict triage error. The
models are non-deterministic, so quote a mean across runs
(`pnpm evaluate:aggregate`) rather than a single run. See
[`evaluation/README.md`](evaluation/README.md) for flags, the case-file format,
and what each metric measures.

## Notes

- Both providers are used on free tiers. **Groq's rate limit is the one that
  bites** — the Referee runs once per case and back-to-back evaluation batches
  will hit it. The harness paces itself with a 10s gap (`--delay MS` to widen).
  The free tier also caps tokens *per day*, which no delay helps; if you exhaust
  it, the SOAP and triage level still complete and only the confidence score is lost.
- The MTS chart set in `lib/ai/mts-charts.ts` is a condensed, paraphrased subset.
  Production use would need the full 52-chart set licensed from the Manchester
  Triage Group.
- The AI pipeline runs in Next's `after()` once a session ends. If it fails
  there nothing retries it — the case still reaches the clinician, but with a
  "Summary not ready" placeholder instead of the SOAP report.
- `/privacy` is a prototype placeholder, not a notice fit for real patient data.
