/**
 * Per-interview patient message cap, checked by the chat route against the
 * count kept by public.record_interview_message (which patients cannot
 * reset). Simulated interviews finish in 4–14 patient messages, so 25 leaves
 * room for chattier patients.
 */
export const INTERVIEW_MESSAGE_LIMIT = 25;

/**
 * From this patient message on, the assistant is told to start wrapping up,
 * leaving room for the closing question, the patient's answer and the
 * closing message before the hard cap.
 */
export const INTERVIEW_WRAP_UP_FROM = INTERVIEW_MESSAGE_LIMIT - 3;

/** Response body the chat route returns at the cap; the client matches on it. */
export const INTERVIEW_LIMIT_REACHED = "interview_message_limit_reached";
