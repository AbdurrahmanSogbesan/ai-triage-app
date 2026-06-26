// Evaluation harness runner.
//
//   tsx evaluation/run-evaluation.ts [--limit N] [--delay MS] [--case id,id]
//
// Runs each synthetic case in evaluation/cases/ through the REAL AI triage
// pipeline (lib/ai/*) headlessly — no browser, no database — and writes every
// intermediate output plus a per-case metric comparison under
// evaluation/results/<timestamp>/cases/<caseId>/.
//
// A failure in one stage of one case is logged to that case's directory and
// the run continues; one bad case never crashes the whole run.

// Load secrets from .env.local before any AI provider is constructed. Node 20's
// built-in env-file loader avoids a dotenv dependency.
try {
  process.loadEnvFile(".env.local");
} catch {
  console.warn("[run] could not load .env.local; relying on ambient env vars");
}

import { promises as fs } from "node:fs";
import path from "node:path";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";

import { selectChart } from "@/lib/ai/chart-selector";
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts";
import { generateSoapReport } from "@/lib/ai/soap";
import { runReferee } from "@/lib/ai/referee";
import type { RefereeOutput, SoapReport } from "@/lib/ai/schemas";

import { evaluateCase } from "./evaluate-metrics";
import { simulatePatientReply } from "./simulate-patient";
import type {
  ChartSelectionLog,
  PerCaseEvaluation,
  SyntheticCase,
  TranscriptTurn,
} from "./types";

const INTERVIEW_MODEL_ID = "gemini-2.5-flash";
const MAX_INTERVIEW_TURNS = 15;
const DEFAULT_DELAY_MS = 10_000;
const FALLBACK_CHART = "Unwell Adult";

const CASES_DIR = path.join(process.cwd(), "evaluation", "cases");
const RESULTS_ROOT = path.join(process.cwd(), "evaluation", "results");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const limit = get("--limit");
  const delay = get("--delay");
  const onlyCases = get("--case");
  return {
    limit: limit ? parseInt(limit, 10) : undefined,
    delayMs: delay ? parseInt(delay, 10) : DEFAULT_DELAY_MS,
    onlyCases: onlyCases ? onlyCases.split(",").map((s) => s.trim()) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Case loading + patient adapter
// ---------------------------------------------------------------------------

async function loadCases(filter?: string[]): Promise<SyntheticCase[]> {
  const files = (await fs.readdir(CASES_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort();
  const cases: SyntheticCase[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(CASES_DIR, file), "utf8");
    const parsed = JSON.parse(raw) as SyntheticCase;
    if (filter && !filter.includes(parsed.id)) continue;
    cases.push(parsed);
  }
  return cases;
}

/** Build the patient profile the AI modules expect from case demographics. */
function toPatientProfile(c: SyntheticCase) {
  const birthYear = new Date().getFullYear() - c.demographics.age;
  return {
    date_of_birth: `${birthYear}-01-01`,
    sex: c.demographics.sex,
    preferred_language: c.demographics.preferred_language ?? "English",
  };
}

// ---------------------------------------------------------------------------
// Stage 2: simulated interview
// ---------------------------------------------------------------------------

function isClosingMessage(text: string): boolean {
  // The interview prompt allows "Thank you" only in the final TURN B closing
  // message, so a reply that opens with it signals end-of-interview.
  return text.trim().toLowerCase().startsWith("thank you");
}

async function interviewTurn(
  patientCase: SyntheticCase,
  chartName: string,
  transcript: TranscriptTurn[],
): Promise<string> {
  const system = buildInterviewSystemPrompt({
    chartName,
    chiefComplaint: patientCase.chief_complaint,
    patient: toPatientProfile(patientCase),
    vitals: patientCase.vitals,
  });
  const { text } = await generateText({
    model: google(INTERVIEW_MODEL_ID),
    system,
    messages: transcript.map((t) => ({ role: t.role, content: t.text })),
    temperature: 0.4,
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 0 } },
    },
  });
  return text.trim();
}

/**
 * Runs the multi-turn interview. Seeds the transcript with the chief complaint
 * as the patient's first message (the interview prompt treats it that way),
 * then alternates triage-AI question / simulated-patient answer until the AI
 * emits its closing message or the turn cap is hit.
 */
async function runInterview(
  patientCase: SyntheticCase,
  chartName: string,
): Promise<{ transcript: TranscriptTurn[]; ended: boolean; turns: number }> {
  const transcript: TranscriptTurn[] = [
    { role: "user", text: patientCase.chief_complaint },
  ];
  let ended = false;
  let turns = 0;

  while (turns < MAX_INTERVIEW_TURNS) {
    const aiText = await interviewTurn(patientCase, chartName, transcript);
    transcript.push({ role: "assistant", text: aiText });
    turns++;

    if (isClosingMessage(aiText)) {
      ended = true;
      break;
    }

    const patientText = await simulatePatientReply(patientCase, transcript);
    transcript.push({ role: "user", text: patientText });
  }

  return { transcript, ended, turns };
}

// ---------------------------------------------------------------------------
// Per-case pipeline
// ---------------------------------------------------------------------------

async function writeJson(dir: string, name: string, data: unknown) {
  await fs.writeFile(
    path.join(dir, name),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

const colour = {
  ok: (s: string) => `[32m${s}[0m`,
  bad: (s: string) => `[31m${s}[0m`,
  dim: (s: string) => `[2m${s}[0m`,
};

async function runCase(
  patientCase: SyntheticCase,
  caseDir: string,
  index: number,
  total: number,
): Promise<PerCaseEvaluation> {
  await fs.mkdir(caseDir, { recursive: true });
  const errors: string[] = [];
  const progress: string[] = [];

  // Stage 1: chart selection -------------------------------------------------
  let selectedChart: string | null = null;
  let chartFallback = false;
  try {
    const selection = await selectChart({
      chiefComplaint: patientCase.chief_complaint,
      patient: toPatientProfile(patientCase),
      vitals: patientCase.vitals,
    });
    selectedChart = selection.chart;
    const chartLog: ChartSelectionLog = {
      selected_chart: selection.chart,
      rationale: selection.rationale,
      expected_chart: patientCase.expected.chart,
      match: selection.chart === patientCase.expected.chart,
      fallback_used: false,
    };
    await writeJson(caseDir, "chart-selection.json", chartLog);
    progress.push(
      `chart: ${chartLog.match ? colour.ok("✓") : colour.bad("✗")} ${selection.chart}`,
    );
  } catch (err) {
    // Mirror the app: fall back to Unwell Adult so the interview can proceed.
    chartFallback = true;
    selectedChart = FALLBACK_CHART;
    const msg = `chart selection failed: ${errMsg(err)}`;
    errors.push(msg);
    await writeJson(caseDir, "chart-selection.json", {
      selected_chart: FALLBACK_CHART,
      rationale: "selector errored — defaulted to Unwell Adult",
      expected_chart: patientCase.expected.chart,
      match: FALLBACK_CHART === patientCase.expected.chart,
      fallback_used: true,
    } satisfies ChartSelectionLog);
    progress.push(colour.bad(`chart: ✗ (fallback)`));
  }

  // Stage 2: interview -------------------------------------------------------
  let transcript: TranscriptTurn[] = [
    { role: "user", text: patientCase.chief_complaint },
  ];
  try {
    const result = await runInterview(patientCase, selectedChart);
    transcript = result.transcript;
    await writeJson(caseDir, "transcript.json", {
      ended_naturally: result.ended,
      turns: result.turns,
      forced_end: !result.ended,
      turns_list: result.transcript,
    });
    if (!result.ended) {
      const warn = `interview hit ${MAX_INTERVIEW_TURNS}-turn cap without closing`;
      errors.push(warn);
      progress.push(colour.bad(`interview: ${result.turns} turns (forced)`));
    } else {
      progress.push(`interview: ${result.turns} turns`);
    }
  } catch (err) {
    errors.push(`interview failed: ${errMsg(err)}`);
    await writeJson(caseDir, "transcript.json", {
      ended_naturally: false,
      turns: transcript.length,
      forced_end: true,
      turns_list: transcript,
      error: errMsg(err),
    });
    progress.push(colour.bad("interview: failed"));
  }

  // Stage 3: SOAP ------------------------------------------------------------
  let soap: SoapReport | null = null;
  try {
    soap = await generateSoapReport({
      chartName: selectedChart,
      chiefComplaint: patientCase.chief_complaint,
      patient: toPatientProfile(patientCase),
      vitals: patientCase.vitals,
      transcript,
      languageUsed: patientCase.demographics.preferred_language ?? "English",
    });
    await writeJson(caseDir, "soap-report.json", soap);
    progress.push(`triage: ${triageColour(patientCase, soap)}`);
  } catch (err) {
    errors.push(`SOAP generation failed: ${errMsg(err)}`);
    await writeJson(caseDir, "soap-report.json", { error: errMsg(err) });
    progress.push(colour.bad("triage: failed"));
  }

  // Stage 4: referee ---------------------------------------------------------
  let referee: RefereeOutput | null = null;
  if (soap) {
    try {
      referee = await runReferee({
        chartName: selectedChart,
        chiefComplaint: patientCase.chief_complaint,
        vitals: patientCase.vitals,
        transcript,
        soap,
      });
      await writeJson(caseDir, "referee-output.json", referee);
      progress.push(`confidence: ${referee.confidence_score}`);
    } catch (err) {
      errors.push(`referee failed: ${errMsg(err)}`);
      await writeJson(caseDir, "referee-output.json", { error: errMsg(err) });
      progress.push(colour.bad("confidence: failed"));
    }
  }

  // Stage 5: per-case evaluation --------------------------------------------
  const evaluation = evaluateCase({
    patientCase,
    selectedChart: chartFallback ? FALLBACK_CHART : selectedChart,
    soap,
    referee,
    errors,
  });
  await writeJson(caseDir, "evaluation.json", evaluation);

  const tag = `[${index + 1}/${total}]`;
  console.log(`${tag} ${patientCase.id} — ${progress.join(" | ")}`);
  return evaluation;
}

function triageColour(c: SyntheticCase, soap: SoapReport): string {
  const actual = soap.assessment.triage_level;
  const ok = actual === c.expected.triage_level;
  return ok ? colour.ok(`✓ ${actual}`) : colour.bad(`✗ ${actual} (exp ${c.expected.triage_level})`);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { limit, delayMs, onlyCases } = parseArgs();

  let cases = await loadCases(onlyCases);
  if (limit !== undefined) cases = cases.slice(0, limit);
  if (cases.length === 0) {
    throw new Error("No cases to run (check evaluation/cases/ and filters)");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(RESULTS_ROOT, timestamp);
  await fs.mkdir(path.join(runDir, "cases"), { recursive: true });

  console.log(
    `\n=== Evaluation run ${timestamp} — ${cases.length} case(s), ${delayMs}ms between cases ===\n`,
  );

  const evaluations: PerCaseEvaluation[] = [];
  for (let i = 0; i < cases.length; i++) {
    const patientCase = cases[i];
    const caseDir = path.join(runDir, "cases", patientCase.id);
    try {
      const evaluation = await runCase(patientCase, caseDir, i, cases.length);
      evaluations.push(evaluation);
    } catch (err) {
      // Last-resort guard — a case should handle its own stage errors, but if
      // something unexpected throws we still record it and move on.
      console.error(colour.bad(`[${i + 1}/${cases.length}] ${patientCase.id} — fatal: ${errMsg(err)}`));
      await fs.mkdir(caseDir, { recursive: true });
      await writeJson(caseDir, "error.json", { error: errMsg(err) });
    }
    if (i < cases.length - 1) await sleep(delayMs);
  }

  await writeJson(runDir, "run-info.json", {
    timestamp,
    total_cases: cases.length,
    case_ids: cases.map((c) => c.id),
  });

  console.log(colour.dim(`\nRun complete. Results in evaluation/results/${timestamp}`));
  console.log(
    colour.dim(`Compute metrics with: pnpm evaluate:metrics --run ${timestamp}`),
  );
}

main().catch((err) => {
  console.error("[run] fatal:", err);
  process.exit(1);
});
