import "server-only";

import { patientGuidanceSchema } from "@/lib/ai/schemas";
import type { Enums, Json, Tables } from "@/types/database";

/** Referee confidence needed before AI-written guidance reaches the patient. */
export const GUIDANCE_MIN_CONFIDENCE = 90;
/** Confidence needed for the fixed "go now" prompt on red/orange cases. */
export const GO_NOW_MIN_CONFIDENCE = 80;
/**
 * How long after the session ends we keep showing "preparing" before
 * assuming the pipeline failed. SOAP + referee normally land in under a
 * minute.
 */
export const PREPARING_TIMEOUT_MS = 3 * 60 * 1000;

// How soon to come in, chosen from the triage level rather than written by
// the model so it can never contradict the level. Red/orange get the go-now
// prompt instead.
const HOW_SOON: Record<Enums<"triage_level">, string | null> = {
  red: null,
  orange: null,
  yellow: "Come in to the clinic today.",
  green: "Come in within the next day or two.",
  blue: "Book a routine visit when it suits you.",
};

// Red/orange patients are told to go to hospital now, so what they do in the
// meantime is fixed rather than model-written: in testing the model gave an
// orange chest-pain patient "rest as much as possible" advice.
const ON_THE_WAY = [
  "Don't drive yourself. Ask someone to take you, or call 112.",
  "If you can, have someone stay with you.",
  "Bring your medicines, or a list of them.",
];

export type NextSteps =
  | { kind: "preparing"; refreshUntil: number }
  | {
      kind: "guidance";
      goNow: boolean;
      howSoon: string | null;
      whileYouWait: string[];
      seekEmergencyCareIf: string[];
    }
  | { kind: "go-now" }
  | { kind: "review" };

export type ReportForNextSteps = Pick<
  Tables<"consultation_reports">,
  | "status"
  | "session_ended_at"
  | "confidence_score"
  | "ai_triage_label"
  | "soap_report"
>;

/**
 * Decides what the patient sees about a finished session. Returns null when
 * nothing should be shown: the session hasn't ended, was abandoned, or has
 * already been completed by a clinician.
 */
export function resolveNextSteps(
  report: ReportForNextSteps,
  now = Date.now(),
): NextSteps | null {
  if (!report.session_ended_at) return null;

  if (report.status === "awaiting_referee") {
    const deadline =
      Date.parse(report.session_ended_at) + PREPARING_TIMEOUT_MS;
    // Past the deadline the SOAP or referee step failed; the case still
    // reaches a clinician, so say that rather than spin forever.
    return now < deadline
      ? { kind: "preparing", refreshUntil: deadline }
      : { kind: "review" };
  }

  if (report.status !== "awaiting_clinician") return null;

  const confidence = report.confidence_score;
  const level = report.ai_triage_label;
  const goNow = level === "red" || level === "orange";

  if (confidence !== null && confidence >= GUIDANCE_MIN_CONFIDENCE) {
    const guidance = readPatientGuidance(report.soap_report);
    // Reports generated before patient guidance existed fall through to the
    // below-gate states.
    if (guidance) {
      return {
        kind: "guidance",
        goNow,
        howSoon: level ? HOW_SOON[level] : null,
        whileYouWait: goNow ? ON_THE_WAY : guidance.while_you_wait,
        seekEmergencyCareIf: guidance.seek_emergency_care_if,
      };
    }
  }

  if (goNow && confidence !== null && confidence >= GO_NOW_MIN_CONFIDENCE) {
    return { kind: "go-now" };
  }

  return { kind: "review" };
}

function readPatientGuidance(soap: Json | null) {
  if (!soap || typeof soap !== "object" || Array.isArray(soap)) return null;
  const parsed = patientGuidanceSchema.safeParse(soap.patient_guidance);
  return parsed.success ? parsed.data : null;
}
