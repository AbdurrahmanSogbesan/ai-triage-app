// LLM-based patient simulator.
//
// Plays the patient's side of the triage interview. Given the case persona and
// the conversation so far, it generates the patient's next reply. It uses
// Gemini (same provider family as the interview), but it is given ONLY the
// persona — never the expected chart or triage level. The whole point of the
// evaluation is whether the triage AI *discovers* the right information by
// asking; leaking the answer to the patient would invalidate that.

import { google } from "@ai-sdk/google";
import { generateText } from "ai";

import type { SyntheticCase, TranscriptTurn } from "./types";

const MODEL_ID = "gemini-2.5-flash";

function buildPatientSystemPrompt(persona: SyntheticCase["patient_persona"]): string {
  const list = (items: string[]) =>
    items.length ? items.map((i) => `- ${i}`).join("\n") : "- (none)";

  return [
    "You are simulating a patient in a medical triage interview. You are NOT an AI assistant.",
    "You are a real person who is unwell and answering a triage nurse's questions.",
    "",
    "YOUR SYMPTOMS (things you are experiencing and will describe when asked):",
    list(persona.symptoms),
    "",
    "TIME-SENSITIVE SYMPTOMS YOU ALSO HAVE (mention these if asked something relevant, but do NOT blurt them out unprompted):",
    list(persona.red_flags_present),
    "",
    "YOUR PAST MEDICAL HISTORY (mention if asked):",
    list(persona.medical_history),
    "",
    "YOUR CURRENT MEDICATIONS (mention if asked):",
    list(persona.medications),
    "",
    "YOUR ALLERGIES (mention if asked):",
    list(persona.allergies),
    "",
    `YOUR COMMUNICATION STYLE: ${persona.communication_style}`,
    "",
    "RULES:",
    "- Answer only what is asked. Do not volunteer information the interviewer hasn't asked about.",
    "- If asked about something in your symptom or red-flag lists, describe it naturally and truthfully.",
    "- If asked about something NOT in your lists, say you don't have that symptom / it doesn't apply to you.",
    "- Stay in character and use the communication style described above.",
    "- Keep replies to 1-3 sentences. Real patients don't write paragraphs.",
    "- Do NOT use medical terminology unless your communication style says you're medically aware.",
    "- Never break character, never mention that you are an AI, and never describe a triage level or diagnosis.",
    "- If the interviewer asks 'anything else?' or 'is there anything else you'd like to add', mention any remaining symptoms from your lists that haven't come up yet; if everything has been covered, say no (e.g. \"No, that's everything\").",
  ].join("\n");
}

/**
 * Generates the patient's next reply given the conversation so far. The
 * transcript is in the interview's point of view (assistant = triage AI,
 * user = patient); we flip the roles so the simulator sees the AI's questions
 * as the incoming messages and its own prior answers as its past replies.
 */
export async function simulatePatientReply(
  patientCase: SyntheticCase,
  transcript: TranscriptTurn[],
): Promise<string> {
  const messages = transcript.map((turn) => ({
    role: (turn.role === "assistant" ? "user" : "assistant") as
      | "user"
      | "assistant",
    content: turn.text,
  }));

  const { text } = await generateText({
    model: google(MODEL_ID),
    system: buildPatientSystemPrompt(patientCase.patient_persona),
    messages,
    temperature: 0.7,
    providerOptions: {
      google: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    },
  });

  return text.trim();
}
