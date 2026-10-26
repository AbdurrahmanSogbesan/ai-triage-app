/**
 * Per-interview patient message cap, checked by the chat route against the
 * count kept by public.record_interview_message (which patients cannot
 * reset). Simulated interviews finish in 4–14 patient messages, so 25 leaves
 * room for chattier patients.
 */
export const INTERVIEW_MESSAGE_LIMIT = 25;

/** From this patient message on, the assistant is told how few questions remain. */
export const INTERVIEW_PRIORITISE_FROM = 19;

/**
 * From this patient message on, the route sends the fixed closing question
 * and closing message itself instead of calling the model. A prompt alone
 * doesn't reliably stop the model probing, and this guarantees a clean
 * ending before the hard cap.
 */
export const INTERVIEW_CLOSE_FROM = 23;

/** Response body the chat route returns at the cap; the client matches on it. */
export const INTERVIEW_LIMIT_REACHED = "interview_message_limit_reached";
