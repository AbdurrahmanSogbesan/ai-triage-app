# Evaluation Harness

Runs synthetic patient cases through the real AI triage pipeline (`lib/ai/*`)
headlessly — no browser, no database — and reports how well it performs. Use it
to tune prompts and to generate the final evaluation numbers.

## Prerequisites

- `pnpm install` has been run.
- `.env.local` contains `GOOGLE_GENERATIVE_AI_API_KEY` (Gemini: chart selector,
  interview, SOAP, LLM matcher) and `GROQ_API_KEY` (Groq: the Referee). The
  harness loads `.env.local` automatically.

## The three commands

### 1. `pnpm evaluate` — run the cases

Runs every case in `evaluation/cases/` through the full pipeline (chart selection
→ simulated interview → SOAP → Referee → per-case scoring) and writes all outputs
to a fresh `evaluation/results/<timestamp>/` folder.

```bash
pnpm evaluate
```

Useful flags:

| Flag | What it does | Example |
| --- | --- | --- |
| `--limit N` | Only run the first N cases (quick smoke test). | `pnpm evaluate --limit 3` |
| `--case a,b` | Only run specific case ids. | `pnpm evaluate --case chest-pain-red-01,headache-orange-01` |
| `--delay MS` | Delay between cases (default 10000) to stay under Groq's rate limit. | `pnpm evaluate --delay 15000` |

Each case folder gets: `chart-selection.json`, `transcript.json` (the full
simulated conversation), `soap-report.json`, `referee-output.json`, and
`evaluation.json` (the per-case score). A failed AI call on one case is logged
and the run continues — one bad case never crashes the batch.

### 2. `pnpm evaluate:metrics` — score a run

Reads a run's per-case results and writes `summary.json` + a human-readable
`report.md` (headline metrics, confusion matrix, per-case breakdown). Defaults to
the most recent run if `--run` is omitted.

```bash
pnpm evaluate:metrics --run 2026-06-26T12-57-25-447Z
```

Add `--llm-match` to re-score symptom/red-flag capture with an LLM yes/no judge
instead of keyword matching. This recognises paraphrases (e.g. "room spinning" vs
"the room was spinning") and is the accurate number to quote. It re-uses the
already-stored SOAPs (no pipeline re-run) and writes parallel `summary.llm.json`
+ `report.llm.md`, leaving the keyword versions intact for comparison.

```bash
pnpm evaluate:metrics --run 2026-06-26T12-57-25-447Z --llm-match
```

### 3. `pnpm evaluate:aggregate` — combine runs for stability

LLM triage is non-deterministic, so a single run isn't fully trustworthy. Run the
suite a few times **on the same prompts/cases**, then aggregate to get each metric
as mean / range and see which cases flip between runs. Writes
`evaluation/results/stability-report.md`.

```bash
pnpm evaluate:aggregate --runs 2026-06-26T12-57-25-447Z,2026-06-26T13-39-15-448Z,2026-06-26T13-51-33-333Z
```

(Omit `--runs` to default to the last 3 runs.)

## Typical workflow

```bash
# 1. Run the suite three times on the current prompts
pnpm evaluate
pnpm evaluate
pnpm evaluate

# 2. Score each run with the accurate LLM matcher (use the timestamps printed above)
pnpm evaluate:metrics --run <ts1> --llm-match
pnpm evaluate:metrics --run <ts2> --llm-match
pnpm evaluate:metrics --run <ts3> --llm-match

# 3. Aggregate for stability (mean ± range + per-case flip table)
pnpm evaluate:aggregate --runs <ts1>,<ts2>,<ts3>
```

## What the metrics mean

| Metric | Meaning |
| --- | --- |
| Chart selection accuracy | Right MTS chart chosen for the complaint. |
| Triage accuracy | Triage level matches the case's expected level. |
| Under-triage rate | Assigned a *less* urgent level than expected (the safety-critical failure). |
| Over-triage rate | Assigned a *more* urgent level than expected (cautious, safer). |
| Symptom capture | Expected symptoms that appear in the SOAP (use the `--llm-match` value). |
| Red-flag capture | Expected red flags surfaced in the assessment/plan. |
| Confidence reliability | Whether the Referee's lower-confidence bands have higher triage error. |

## Notes

- All output under `evaluation/results/` is git-ignored (local only). The harness
  code and the synthetic cases are committed.
- Groq's free tier has a daily token cap; running many full batches in one day can
  exhaust it and make the Referee fail (the SOAP/triage still complete — only the
  confidence score is lost). Increasing `--delay` does **not** help a daily cap.
- Cases live in `evaluation/cases/*.json`. Add a file there to add a case.
