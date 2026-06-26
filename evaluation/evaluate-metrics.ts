// Metric computation for the evaluation harness.
//
// This module is BOTH a library (the runner imports evaluateCase / the fuzzy
// matchers to write per-case evaluation.json) AND a CLI:
//
//   tsx evaluation/evaluate-metrics.ts --run <timestamp>
//
// The CLI reads every per-case evaluation.json under a run directory, computes
// the three core evaluation metrics plus chart-selection accuracy, and writes
// summary.json + a human-readable report.md.

import { promises as fs } from "node:fs";
import path from "node:path";

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

import { TRIAGE_LEVELS, type TriageLevel } from "@/lib/ai/mts-charts";
import type { RefereeOutput, SoapReport } from "@/lib/ai/schemas";

import type {
  ConfidenceBand,
  EvaluationSummary,
  PerCaseEvaluation,
  SyntheticCase,
  TriageDirection,
} from "./types";

// ---------------------------------------------------------------------------
// Triage level helpers
// ---------------------------------------------------------------------------

/** Acuity rank: red (most urgent) = 5 ... blue (least urgent) = 1. */
export function triageRank(level: string): number {
  const idx = (TRIAGE_LEVELS as readonly string[]).indexOf(level);
  return idx === -1 ? 0 : TRIAGE_LEVELS.length - idx;
}

export function isTriageLevel(value: string): value is TriageLevel {
  return (TRIAGE_LEVELS as readonly string[]).includes(value);
}

/**
 * Direction of a triage decision relative to ground truth. "over-triaged"
 * means the AI assigned a MORE urgent level than expected (safer but wasteful);
 * "under-triaged" means LESS urgent (the safety-critical failure mode).
 */
export function triageDirection(
  expected: string,
  actual: string,
): TriageDirection {
  const e = triageRank(expected);
  const a = triageRank(actual);
  if (a === e) return "correct";
  return a > e ? "over-triaged" : "under-triaged";
}

/** Confidence bands per the referee prompt anchors (85+/75-84/<75). */
export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 85) return "high";
  if (score >= 75) return "moderate";
  return "low";
}

// ---------------------------------------------------------------------------
// Fuzzy keyword matching for extraction precision
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "with", "and", "or", "my", "is",
  "are", "that", "this", "for", "no", "not", "it", "as", "at", "by", "but",
  "be", "has", "have", "had", "i", "me", "you", "any", "some", "was", "were",
  "from", "into", "out", "up", "down", "her", "his", "its", "their",
]);

/** Crude suffix stripper so "radiating"/"radiates"/"radiate" collapse. */
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length > 4 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s")) w = w.slice(0, -1);
  return w;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Keyword heuristic: lowercase both sides, require at least
 * two meaningful (non-stopword) stems from the expected phrase to appear in the
 * blob. Phrases with only one meaningful word require that single stem.
 */
export function fuzzyContains(blob: string, phrase: string): boolean {
  const blobStems = new Set(tokenize(blob).map(stem));
  const phraseStems = Array.from(
    new Set(
      tokenize(phrase)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
        .map(stem),
    ),
  );
  if (phraseStems.length === 0) {
    // No meaningful words (very short phrase) — fall back to raw inclusion.
    return blob.toLowerCase().includes(phrase.toLowerCase().trim());
  }
  const required = Math.min(2, phraseStems.length);
  const matched = phraseStems.filter((s) => blobStems.has(s)).length;
  return matched >= required;
}

/** Text the SOAP exposes about what the patient said (subjective sections). */
function subjectiveBlob(soap: SoapReport): string {
  const s = soap.subjective;
  return [
    s.chief_complaint,
    s.history_of_present_illness,
    ...s.associated_symptoms,
    ...s.past_medical_history,
    ...s.current_medications,
    ...s.allergies,
    s.social_history ?? "",
  ].join(" \n ");
}

/** Text the SOAP exposes about red flags (assessment + plan). */
function assessmentBlob(soap: SoapReport): string {
  const a = soap.assessment;
  return [
    ...a.discriminators_triggered.map((d) => `${d.name} ${d.evidence}`),
    a.rationale,
    ...soap.plan.red_flags_to_monitor,
    ...soap.plan.next_steps,
  ].join(" \n ");
}

// ---------------------------------------------------------------------------
// Per-case evaluation (used by the runner)
// ---------------------------------------------------------------------------

export function evaluateCase(params: {
  patientCase: SyntheticCase;
  selectedChart: string | null;
  soap: SoapReport | null;
  referee: RefereeOutput | null;
  errors: string[];
}): PerCaseEvaluation {
  const { patientCase, selectedChart, soap, referee, errors } = params;
  const expected = patientCase.expected;

  const chartCorrect = selectedChart === expected.chart;

  const actualLevel = soap ? soap.assessment.triage_level : null;
  const triageCorrect = actualLevel === expected.triage_level;
  const direction = actualLevel
    ? triageDirection(expected.triage_level, actualLevel)
    : null;

  // Extraction precision — only computable when a SOAP exists.
  const subj = soap ? subjectiveBlob(soap) : "";
  const assess = soap ? assessmentBlob(soap) : "";

  const symptomsCaptured = soap
    ? expected.key_symptoms_to_capture.filter((s) => fuzzyContains(subj, s))
    : [];
  const symptomsMissed = expected.key_symptoms_to_capture.filter(
    (s) => !symptomsCaptured.includes(s),
  );

  const redFlagsCaptured = soap
    ? expected.red_flags_to_capture.filter((f) => fuzzyContains(assess, f))
    : [];
  const redFlagsMissed = expected.red_flags_to_capture.filter(
    (f) => !redFlagsCaptured.includes(f),
  );

  const score = referee ? referee.confidence_score : null;

  return {
    case_id: patientCase.id,
    status: errors.length > 0 ? "error" : "ok",
    errors,
    chart: {
      expected: expected.chart,
      actual: selectedChart,
      correct: chartCorrect,
    },
    triage: {
      expected: expected.triage_level,
      actual: actualLevel,
      correct: triageCorrect,
      direction,
    },
    symptoms: {
      expected: expected.key_symptoms_to_capture,
      captured: symptomsCaptured,
      missed: symptomsMissed,
    },
    red_flags: {
      expected: expected.red_flags_to_capture,
      captured: redFlagsCaptured,
      missed: redFlagsMissed,
    },
    confidence: {
      score,
      band: score === null ? null : confidenceBand(score),
    },
  };
}

// ---------------------------------------------------------------------------
// Aggregate summary
// ---------------------------------------------------------------------------

export function computeSummary(
  evaluations: PerCaseEvaluation[],
  runTimestamp: string,
): EvaluationSummary {
  const total = evaluations.length;
  const evaluable = evaluations.filter((e) => e.triage.actual !== null);
  const errorCases = evaluations.filter((e) => e.status === "error").length;

  // Triage accuracy — denominator is the full case set; cases without a
  // SOAP count as neither over- nor under-triaged but do lower accuracy.
  const correct = evaluations.filter((e) => e.triage.correct).length;
  const over = evaluations.filter(
    (e) => e.triage.direction === "over-triaged",
  ).length;
  const under = evaluations.filter(
    (e) => e.triage.direction === "under-triaged",
  ).length;

  // 5x5 confusion matrix (expected row -> actual col), only evaluable cases.
  const matrix: Record<string, Record<string, number>> = {};
  for (const expected of TRIAGE_LEVELS) {
    matrix[expected] = {};
    for (const actual of TRIAGE_LEVELS) matrix[expected][actual] = 0;
  }
  for (const e of evaluable) {
    const exp = e.triage.expected;
    const act = e.triage.actual as string;
    if (matrix[exp] && matrix[exp][act] !== undefined) {
      matrix[exp][act] += 1;
    }
  }

  const chartCorrect = evaluations.filter((e) => e.chart.correct).length;

  // Extraction precision — pooled across all cases.
  let symptomsExpected = 0;
  let symptomsCaptured = 0;
  let redFlagsExpected = 0;
  let redFlagsCaptured = 0;
  const perCaseExtraction = evaluations.map((e) => {
    symptomsExpected += e.symptoms.expected.length;
    symptomsCaptured += e.symptoms.captured.length;
    redFlagsExpected += e.red_flags.expected.length;
    redFlagsCaptured += e.red_flags.captured.length;
    return {
      case_id: e.case_id,
      symptoms_expected: e.symptoms.expected.length,
      symptoms_captured: e.symptoms.captured.length,
      red_flags_expected: e.red_flags.expected.length,
      red_flags_captured: e.red_flags.captured.length,
    };
  });

  // Confidence reliability — error rate per band should rise as the
  // band falls (high < moderate < low).
  const bands: ConfidenceBand[] = ["high", "moderate", "low"];
  const confidenceByBand = bands.map((band) => {
    const inBand = evaluations.filter((e) => e.confidence.band === band);
    const withTriage = inBand.filter((e) => e.triage.actual !== null);
    const errorsInBand = withTriage.filter((e) => !e.triage.correct).length;
    const avgConfidence =
      inBand.length > 0
        ? inBand.reduce((sum, e) => sum + (e.confidence.score ?? 0), 0) /
          inBand.length
        : 0;
    return {
      band,
      case_count: inBand.length,
      triage_error_rate:
        withTriage.length > 0 ? errorsInBand / withTriage.length : 0,
      avg_confidence: round(avgConfidence, 1),
    };
  });

  // Reliability holds if error rate is non-decreasing across the bands that
  // actually have cases (ignoring empty bands).
  const presentBands = confidenceByBand.filter((b) => b.case_count > 0);
  let reliabilityHolds = true;
  for (let i = 1; i < presentBands.length; i++) {
    if (presentBands[i].triage_error_rate < presentBands[i - 1].triage_error_rate) {
      reliabilityHolds = false;
      break;
    }
  }

  return {
    run_timestamp: runTimestamp,
    total_cases: total,
    evaluable_cases: evaluable.length,
    error_cases: errorCases,
    triage_accuracy: ratio(correct, total),
    over_triage_rate: ratio(over, total),
    under_triage_rate: ratio(under, total),
    triage_confusion_matrix: matrix,
    chart_selection_accuracy: ratio(chartCorrect, total),
    symptom_capture_rate: ratio(symptomsCaptured, symptomsExpected),
    red_flag_capture_rate: ratio(redFlagsCaptured, redFlagsExpected),
    per_case_extraction: perCaseExtraction,
    confidence_by_band: confidenceByBand,
    confidence_reliability_holds: reliabilityHolds,
  };
}

function ratio(num: number, den: number): number {
  return den === 0 ? 0 : round(num / den, 4);
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// ---------------------------------------------------------------------------
// Markdown report
// ---------------------------------------------------------------------------

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function renderReport(
  summary: EvaluationSummary,
  evaluations: PerCaseEvaluation[],
): string {
  const lines: string[] = [];
  lines.push(`# Evaluation Report`);
  lines.push("");
  lines.push(`**Run:** ${summary.run_timestamp}`);
  lines.push("");
  lines.push(
    `Total cases: ${summary.total_cases} · Evaluable (SOAP produced): ${summary.evaluable_cases} · Errored: ${summary.error_cases}`,
  );
  lines.push("");

  // Headline metrics
  lines.push(`## Headline metrics`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Chart selection accuracy | ${pct(summary.chart_selection_accuracy)} |`);
  lines.push(`| Triage accuracy | ${pct(summary.triage_accuracy)} |`);
  lines.push(`| Over-triage rate | ${pct(summary.over_triage_rate)} |`);
  lines.push(`| Under-triage rate (safety-critical) | ${pct(summary.under_triage_rate)} |`);
  lines.push(`| Symptom capture rate | ${pct(summary.symptom_capture_rate)} |`);
  lines.push(`| Red-flag capture rate | ${pct(summary.red_flag_capture_rate)} |`);
  lines.push(`| Confidence reliability holds | ${summary.confidence_reliability_holds ? "yes" : "no"} |`);
  lines.push("");

  // Confusion matrix
  lines.push(`## Triage confusion matrix`);
  lines.push("");
  lines.push(`Rows = expected, columns = actual (evaluable cases only).`);
  lines.push("");
  lines.push(`| expected ↓ / actual → | ${TRIAGE_LEVELS.join(" | ")} |`);
  lines.push(`| --- | ${TRIAGE_LEVELS.map(() => "---").join(" | ")} |`);
  for (const exp of TRIAGE_LEVELS) {
    const row = TRIAGE_LEVELS.map((act) => {
      const v = summary.triage_confusion_matrix[exp][act];
      return exp === act && v > 0 ? `**${v}**` : `${v}`;
    });
    lines.push(`| ${exp} | ${row.join(" | ")} |`);
  }
  lines.push("");

  // Confidence reliability
  lines.push(`## Confidence score reliability`);
  lines.push("");
  lines.push(`Error rate should rise as the band falls (high → low).`);
  lines.push("");
  lines.push(`| Band | Cases | Triage error rate | Avg confidence |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const b of summary.confidence_by_band) {
    lines.push(
      `| ${b.band} | ${b.case_count} | ${pct(b.triage_error_rate)} | ${b.avg_confidence} |`,
    );
  }
  lines.push("");

  // Per-case breakdown
  lines.push(`## Per-case breakdown`);
  lines.push("");
  lines.push(
    `| Case | Chart | Triage | Symptoms | Red flags | Conf | Notes |`,
  );
  lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
  for (const e of evaluations) {
    const chartCell = e.chart.correct
      ? `✓ ${e.chart.actual}`
      : `✗ ${e.chart.actual ?? "—"} (exp ${e.chart.expected})`;
    const triageCell =
      e.triage.actual === null
        ? "— (no SOAP)"
        : e.triage.correct
          ? `✓ ${e.triage.actual}`
          : `✗ ${e.triage.actual} (exp ${e.triage.expected}, ${e.triage.direction})`;
    const sympCell = `${e.symptoms.captured.length}/${e.symptoms.expected.length}`;
    const rfCell = `${e.red_flags.captured.length}/${e.red_flags.expected.length}`;
    const confCell =
      e.confidence.score === null
        ? "—"
        : `${e.confidence.score} (${e.confidence.band})`;
    const notes: string[] = [];
    if (e.symptoms.missed.length) notes.push(`missed sx: ${e.symptoms.missed.join("; ")}`);
    if (e.red_flags.missed.length) notes.push(`missed rf: ${e.red_flags.missed.join("; ")}`);
    if (e.errors.length) notes.push(`ERRORS: ${e.errors.join("; ")}`);
    lines.push(
      `| ${e.case_id} | ${chartCell} | ${triageCell} | ${sympCell} | ${rfCell} | ${confCell} | ${notes.join(" — ") || ""} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// LLM-based matching (--llm-match): re-scores extraction precision against the
// stored SOAP reports using a yes/no judgement per expected item, so paraphrases
// ("room spinning" vs "the room was spinning") count as captured. Chart/triage/
// confidence are left untouched — only symptom + red-flag capture are re-derived.
// ---------------------------------------------------------------------------

const MATCH_MODEL_ID = "gemini-2.5-flash";

const matchSchema = z.object({
  present: z
    .array(z.boolean())
    .describe("One boolean per item, in the same order as the items given."),
});

/**
 * Asks the model, for each item, whether the concept appears in the SOAP text
 * (paraphrases / synonyms / clinical equivalents count). Returns a boolean per
 * item aligned by index. Throws on a length mismatch so the caller can fall
 * back to the keyword matcher for that case rather than mis-aligning results.
 */
async function matchItemsLlm(
  contextLabel: string,
  contextText: string,
  items: string[],
): Promise<boolean[]> {
  if (items.length === 0) return [];
  const { object } = await generateObject({
    model: google(MATCH_MODEL_ID),
    schema: matchSchema,
    schemaName: "ItemMatch",
    schemaDescription:
      "For each clinical item, whether it is present in the provided SOAP text.",
    system:
      "You are a clinical evaluator checking whether a SOAP report captured specific clinical concepts. For each item, decide whether the concept is mentioned or described anywhere in the provided text, even if worded differently — paraphrases, synonyms, and clear clinical equivalents all count as present. Judge only from the text; do not infer beyond it.",
    prompt: [
      `${contextLabel}:`,
      contextText,
      "",
      "For EACH item below, is that clinical concept present in the text above?",
      "Return the `present` array with exactly one boolean per item, in the same order.",
      "",
      "Items:",
      ...items.map((it, i) => `${i + 1}. ${it}`),
    ].join("\n"),
    temperature: 0,
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
  });
  if (object.present.length !== items.length) {
    throw new Error(
      `LLM match returned ${object.present.length} results for ${items.length} items`,
    );
  }
  return object.present;
}

/**
 * Re-derives one case's symptom + red-flag capture using LLM matching against
 * the stored SOAP. Falls back to the keyword matcher for a section if the LLM
 * call fails. Returns a fresh PerCaseEvaluation; chart/triage/confidence are
 * copied verbatim from the keyword-based evaluation.
 */
async function reEvaluateCaseWithLlm(
  existing: PerCaseEvaluation,
  soap: SoapReport | null,
): Promise<PerCaseEvaluation> {
  const symptomsExpected = existing.symptoms.expected;
  const redFlagsExpected = existing.red_flags.expected;

  let symptomsCaptured: string[];
  let redFlagsCaptured: string[];

  if (!soap) {
    symptomsCaptured = [];
    redFlagsCaptured = [];
  } else {
    const subj = subjectiveBlob(soap);
    const assess = assessmentBlob(soap);

    try {
      const flags = await matchItemsLlm(
        "SOAP subjective section",
        subj,
        symptomsExpected,
      );
      symptomsCaptured = symptomsExpected.filter((_, i) => flags[i]);
    } catch (err) {
      console.warn(
        `[metrics] LLM symptom match failed for ${existing.case_id}, using keyword: ${err instanceof Error ? err.message : err}`,
      );
      symptomsCaptured = symptomsExpected.filter((s) => fuzzyContains(subj, s));
    }

    try {
      const flags = await matchItemsLlm(
        "SOAP assessment and plan",
        assess,
        redFlagsExpected,
      );
      redFlagsCaptured = redFlagsExpected.filter((_, i) => flags[i]);
    } catch (err) {
      console.warn(
        `[metrics] LLM red-flag match failed for ${existing.case_id}, using keyword: ${err instanceof Error ? err.message : err}`,
      );
      redFlagsCaptured = redFlagsExpected.filter((f) => fuzzyContains(assess, f));
    }
  }

  return {
    ...existing,
    symptoms: {
      expected: symptomsExpected,
      captured: symptomsCaptured,
      missed: symptomsExpected.filter((s) => !symptomsCaptured.includes(s)),
    },
    red_flags: {
      expected: redFlagsExpected,
      captured: redFlagsCaptured,
      missed: redFlagsExpected.filter((f) => !redFlagsCaptured.includes(f)),
    },
  };
}

/** Reads the stored SOAP for a case, or null if absent / an error stub. */
async function readSoap(
  runDir: string,
  caseId: string,
): Promise<SoapReport | null> {
  try {
    const raw = await fs.readFile(
      path.join(runDir, "cases", caseId, "soap-report.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw);
    return parsed?.subjective ? (parsed as SoapReport) : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const RESULTS_DIR = path.join(process.cwd(), "evaluation", "results");

async function readEvaluations(runDir: string): Promise<PerCaseEvaluation[]> {
  const casesDir = path.join(runDir, "cases");
  const entries = await fs.readdir(casesDir, { withFileTypes: true });
  const evaluations: PerCaseEvaluation[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(casesDir, entry.name, "evaluation.json");
    try {
      const raw = await fs.readFile(file, "utf8");
      evaluations.push(JSON.parse(raw) as PerCaseEvaluation);
    } catch {
      console.warn(`[metrics] no evaluation.json for case ${entry.name}, skipping`);
    }
  }
  evaluations.sort((a, b) => a.case_id.localeCompare(b.case_id));
  return evaluations;
}

async function resolveRunDir(arg: string | undefined): Promise<string> {
  if (arg) return path.join(RESULTS_DIR, arg);
  // Default to the most recent run.
  const entries = await fs.readdir(RESULTS_DIR, { withFileTypes: true });
  const runs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (runs.length === 0) throw new Error("No runs found in evaluation/results");
  return path.join(RESULTS_DIR, runs[runs.length - 1]);
}

/**
 * Re-scores extraction precision for every case using the LLM matcher, then
 * recomputes the summary. Writes parallel *.llm.* outputs so the keyword-based
 * results are preserved for side-by-side comparison.
 */
async function runLlmMatch(
  runDir: string,
  timestamp: string,
  keywordEvals: PerCaseEvaluation[],
  matchDelayMs: number,
) {
  console.log(
    `[metrics] re-scoring extraction with LLM matcher (${MATCH_MODEL_ID})...`,
  );
  const rescored: PerCaseEvaluation[] = [];
  for (const ev of keywordEvals) {
    const soap = await readSoap(runDir, ev.case_id);
    const updated = await reEvaluateCaseWithLlm(ev, soap);
    await fs.writeFile(
      path.join(runDir, "cases", ev.case_id, "evaluation.llm.json"),
      JSON.stringify(updated, null, 2),
      "utf8",
    );
    const sFrom = ev.symptoms.captured.length;
    const sTo = updated.symptoms.captured.length;
    console.log(
      `[metrics]   ${ev.case_id}: symptoms ${sFrom}->${sTo}/${ev.symptoms.expected.length}`,
    );
    rescored.push(updated);
    if (matchDelayMs > 0) await sleep(matchDelayMs);
  }

  const summary = computeSummary(rescored, timestamp);
  const report = renderReport(summary, rescored);
  await fs.writeFile(
    path.join(runDir, "summary.llm.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  await fs.writeFile(path.join(runDir, "report.llm.md"), report, "utf8");

  console.log(`[metrics] wrote summary.llm.json and report.llm.md to ${runDir}`);
  console.log(
    `[metrics] (LLM match) symptom capture ${pct(summary.symptom_capture_rate)} · red-flag capture ${pct(summary.red_flag_capture_rate)}`,
  );
}

async function main() {
  const runArgIndex = process.argv.indexOf("--run");
  const runArg = runArgIndex !== -1 ? process.argv[runArgIndex + 1] : undefined;
  const llmMatch = process.argv.includes("--llm-match");
  const delayIndex = process.argv.indexOf("--match-delay");
  const matchDelayMs =
    delayIndex !== -1 ? parseInt(process.argv[delayIndex + 1], 10) : 800;

  const runDir = await resolveRunDir(runArg);
  const timestamp = path.basename(runDir);

  console.log(`[metrics] computing summary for run ${timestamp}`);
  const evaluations = await readEvaluations(runDir);
  if (evaluations.length === 0) {
    throw new Error(`No per-case evaluations found in ${runDir}`);
  }

  const summary = computeSummary(evaluations, timestamp);
  const report = renderReport(summary, evaluations);

  await fs.writeFile(
    path.join(runDir, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  await fs.writeFile(path.join(runDir, "report.md"), report, "utf8");

  console.log(`[metrics] wrote summary.json and report.md to ${runDir}`);
  console.log(
    `[metrics] (keyword match) triage accuracy ${pct(summary.triage_accuracy)} · under-triage ${pct(summary.under_triage_rate)} · chart ${pct(summary.chart_selection_accuracy)} · symptom capture ${pct(summary.symptom_capture_rate)}`,
  );

  if (llmMatch) {
    // LLM matching needs the Gemini key; load .env.local the same way the runner does.
    try {
      process.loadEnvFile(".env.local");
    } catch {
      console.warn("[metrics] could not load .env.local; relying on ambient env vars");
    }
    await runLlmMatch(runDir, timestamp, evaluations, matchDelayMs);
  }
}

// Run main() only when invoked directly as the CLI, not when imported.
const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]).endsWith(path.join("evaluation", "evaluate-metrics.ts"));
if (invokedDirectly) {
  main().catch((err) => {
    console.error("[metrics] fatal:", err);
    process.exit(1);
  });
}
