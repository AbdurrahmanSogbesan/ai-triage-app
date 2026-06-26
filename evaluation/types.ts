// Shared types for the evaluation harness.
//
// The harness runs synthetic patient cases through the real AI triage pipeline
// (lib/ai/*) headlessly and records every intermediate output plus a per-case
// metric comparison. See run-evaluation.ts for orchestration and
// evaluate-metrics.ts for the aggregate thesis metrics.

import type { RefereeOutput, SoapReport } from "@/lib/ai/schemas";
import type { TriageLevel } from "@/lib/ai/mts-charts";

/** A single transcript turn. Mirrors lib/ai's SoapTranscriptTurn shape. */
export type TranscriptTurn = { role: "user" | "assistant"; text: string };

/** Vitals as collected at intake — matches the columns the AI modules read. */
export interface CaseVitals {
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  temperature_celsius: number;
  weight_kg: number;
}

/** A synthetic patient case. One JSON file per case in evaluation/cases/. */
export interface SyntheticCase {
  id: string;
  chief_complaint: string;
  vitals: CaseVitals;
  demographics: {
    age: number;
    sex: string;
    preferred_language?: string;
  };
  patient_persona: {
    symptoms: string[];
    medical_history: string[];
    medications: string[];
    allergies: string[];
    red_flags_present: string[];
    communication_style: string;
  };
  expected: {
    chart: string;
    triage_level: string;
    key_symptoms_to_capture: string[];
    red_flags_to_capture: string[];
  };
}

/** Stage 1 log: chart-selection.json */
export interface ChartSelectionLog {
  selected_chart: string;
  rationale: string;
  expected_chart: string;
  match: boolean;
  /** True when the selector errored and we fell back to Unwell Adult. */
  fallback_used: boolean;
}

export type TriageDirection = "correct" | "over-triaged" | "under-triaged";
export type ConfidenceBand = "high" | "moderate" | "low";

/** Per-case metric comparison: evaluation.json */
export interface PerCaseEvaluation {
  case_id: string;
  status: "ok" | "error";
  /** Human-readable notes about which stages failed, if any. */
  errors: string[];

  chart: {
    expected: string;
    actual: string | null;
    correct: boolean;
  };
  triage: {
    expected: TriageLevel | string;
    actual: TriageLevel | null;
    correct: boolean;
    direction: TriageDirection | null;
  };
  symptoms: {
    expected: string[];
    captured: string[];
    missed: string[];
  };
  red_flags: {
    expected: string[];
    captured: string[];
    missed: string[];
  };
  confidence: {
    score: number | null;
    band: ConfidenceBand | null;
  };
}

/** Everything we computed for one case during a run, kept in memory. */
export interface CaseRunOutputs {
  chartSelection: ChartSelectionLog | null;
  transcript: TranscriptTurn[];
  soap: SoapReport | null;
  referee: RefereeOutput | null;
  evaluation: PerCaseEvaluation;
}

/** Aggregate metrics: summary.json (§3.6 of the thesis). */
export interface EvaluationSummary {
  run_timestamp: string;
  total_cases: number;
  /** Cases that produced a triage level (SOAP succeeded). */
  evaluable_cases: number;
  error_cases: number;

  // §3.6.1 Triage Accuracy
  triage_accuracy: number;
  over_triage_rate: number;
  under_triage_rate: number;
  triage_confusion_matrix: Record<string, Record<string, number>>;

  // Chart Selection Accuracy
  chart_selection_accuracy: number;

  // §3.6.2 Extraction Precision
  symptom_capture_rate: number;
  red_flag_capture_rate: number;
  per_case_extraction: {
    case_id: string;
    symptoms_expected: number;
    symptoms_captured: number;
    red_flags_expected: number;
    red_flags_captured: number;
  }[];

  // §3.6.3 Confidence Score Reliability
  confidence_by_band: {
    band: ConfidenceBand;
    case_count: number;
    triage_error_rate: number;
    avg_confidence: number;
  }[];
  confidence_reliability_holds: boolean;
}
