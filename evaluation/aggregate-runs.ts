// Cross-run stability aggregator.
//
//   tsx evaluation/aggregate-runs.ts --runs <ts1>,<ts2>,<ts3>
//
// Given several runs of the SAME system (same prompts/cases), reports each
// headline metric as mean / min / max across runs, and tracks per-case triage
// consistency (which cases flip between runs — the nondeterminism that makes a
// single run untrustworthy). Reads the already-computed summary.json (keyword)
// and summary.llm.json (LLM match) plus per-case evaluation.json. Pure file I/O
// and arithmetic — no API calls. Writes stability-report.md next to the runs.

import { promises as fs } from "node:fs";
import path from "node:path";

import type { EvaluationSummary, PerCaseEvaluation } from "./types";

const RESULTS_DIR = path.join(process.cwd(), "evaluation", "results");

type RunData = {
  timestamp: string;
  keyword: EvaluationSummary;
  llm: EvaluationSummary | null;
  cases: PerCaseEvaluation[];
};

async function readJsonIfExists<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function loadRun(timestamp: string): Promise<RunData> {
  const runDir = path.join(RESULTS_DIR, timestamp);
  const keyword = await readJsonIfExists<EvaluationSummary>(
    path.join(runDir, "summary.json"),
  );
  if (!keyword) {
    throw new Error(`run ${timestamp} has no summary.json — run metrics first`);
  }
  const llm = await readJsonIfExists<EvaluationSummary>(
    path.join(runDir, "summary.llm.json"),
  );

  const casesDir = path.join(runDir, "cases");
  const entries = await fs.readdir(casesDir, { withFileTypes: true });
  const cases: PerCaseEvaluation[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const ev = await readJsonIfExists<PerCaseEvaluation>(
      path.join(casesDir, entry.name, "evaluation.json"),
    );
    if (ev) cases.push(ev);
  }
  return { timestamp, keyword, llm, cases };
}

function stats(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { mean, min: Math.min(...values), max: Math.max(...values) };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtRange(values: number[]): string {
  const s = stats(values);
  if (s.min === s.max) return pct(s.mean);
  return `${pct(s.mean)}  (range ${pct(s.min)}–${pct(s.max)})`;
}

async function resolveRuns(arg: string | undefined): Promise<string[]> {
  if (arg) return arg.split(",").map((s) => s.trim());
  const entries = await fs.readdir(RESULTS_DIR, { withFileTypes: true });
  const runs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  return runs.slice(-3); // default: last 3 runs
}

async function main() {
  const i = process.argv.indexOf("--runs");
  const runArg = i !== -1 ? process.argv[i + 1] : undefined;
  const timestamps = await resolveRuns(runArg);
  if (timestamps.length < 2) {
    throw new Error("need at least 2 runs to assess stability");
  }

  const runs: RunData[] = [];
  for (const ts of timestamps) runs.push(await loadRun(ts));
  const n = runs.length;

  // Headline metric ranges.
  const m = {
    chart: runs.map((r) => r.keyword.chart_selection_accuracy),
    triage: runs.map((r) => r.keyword.triage_accuracy),
    over: runs.map((r) => r.keyword.over_triage_rate),
    under: runs.map((r) => r.keyword.under_triage_rate),
    sympKw: runs.map((r) => r.keyword.symptom_capture_rate),
    sympLlm: runs.map((r) => r.llm?.symptom_capture_rate ?? NaN),
    rfLlm: runs.map((r) => r.llm?.red_flag_capture_rate ?? NaN),
  };
  const hasLlm = m.sympLlm.every((v) => !Number.isNaN(v));

  // Per-case triage consistency.
  const caseIds = Array.from(
    new Set(runs.flatMap((r) => r.cases.map((c) => c.case_id))),
  ).sort();
  type CaseRow = {
    id: string;
    expected: string;
    actuals: (string | null)[];
    correctCount: number;
    consistent: boolean;
  };
  const rows: CaseRow[] = caseIds.map((id) => {
    const perRun = runs.map((r) => r.cases.find((c) => c.case_id === id));
    const expected = perRun.find(Boolean)?.triage.expected ?? "?";
    const actuals = perRun.map((c) => c?.triage.actual ?? null);
    const correctCount = perRun.filter((c) => c?.triage.correct).length;
    const consistent = new Set(actuals.map((a) => a ?? "—")).size === 1;
    return { id, expected: String(expected), actuals, correctCount, consistent };
  });

  // ---- Render ----
  const out: string[] = [];
  out.push(`# Cross-run stability report`);
  out.push("");
  out.push(`Runs (${n}, same system): ${timestamps.join(", ")}`);
  out.push("");
  out.push(`## Headline metrics (mean across ${n} runs)`);
  out.push("");
  out.push(`| Metric | Value |`);
  out.push(`| --- | --- |`);
  out.push(`| Chart selection accuracy | ${fmtRange(m.chart)} |`);
  out.push(`| Triage accuracy | ${fmtRange(m.triage)} |`);
  out.push(`| Over-triage rate | ${fmtRange(m.over)} |`);
  out.push(`| Under-triage rate | ${fmtRange(m.under)} |`);
  out.push(`| Symptom capture (keyword) | ${fmtRange(m.sympKw)} |`);
  if (hasLlm) {
    out.push(`| Symptom capture (LLM match) | ${fmtRange(m.sympLlm)} |`);
    out.push(`| Red-flag capture (LLM match) | ${fmtRange(m.rfLlm)} |`);
  }
  out.push("");
  out.push(`Per-run triage accuracy: ${m.triage.map(pct).join(" · ")}`);
  out.push("");

  // Consistency summary.
  const flippers = rows.filter((r) => !r.consistent);
  out.push(`## Per-case triage stability`);
  out.push("");
  out.push(
    `${rows.filter((r) => r.consistent).length}/${rows.length} cases gave the SAME triage level in all ${n} runs. ${flippers.length} flipped.`,
  );
  out.push("");
  out.push(`| Case | Expected | ${timestamps.map((_, i) => `run ${i + 1}`).join(" | ")} | Correct |`);
  out.push(`| --- | --- | ${timestamps.map(() => "---").join(" | ")} | --- |`);
  for (const r of rows) {
    const cells = r.actuals.map((a, idx) => {
      const c = runs[idx].cases.find((x) => x.case_id === r.id);
      const ok = c?.triage.correct;
      const val = a ?? "—";
      return ok ? val : `**${val}**`;
    });
    const flag = r.consistent ? "" : " ⚠️";
    out.push(
      `| ${r.id}${flag} | ${r.expected} | ${cells.join(" | ")} | ${r.correctCount}/${n} |`,
    );
  }
  out.push("");
  out.push(`Bold = triaged incorrectly that run. ⚠️ = level changed between runs.`);
  out.push("");

  const report = out.join("\n");
  const outFile = path.join(RESULTS_DIR, "stability-report.md");
  await fs.writeFile(outFile, report, "utf8");

  console.log(report);
  console.log(`\n[aggregate] wrote ${outFile}`);
}

main().catch((err) => {
  console.error("[aggregate] fatal:", err);
  process.exit(1);
});
