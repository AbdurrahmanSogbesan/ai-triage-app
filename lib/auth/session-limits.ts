// Supabase's own session-timeout controls (Dashboard > Auth settings >
// Sessions — "Time-box user sessions" / "Inactivity timeout") require a Pro
// plan or higher. These two limits are the app-level equivalent, enforced in
// proxy.ts on every protected-route request via a pair of cookies instead of
// a session-table lookup.
export const SESSION_STARTED_COOKIE = "session_started_at";
export const LAST_ACTIVITY_COOKIE = "last_activity_at";

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours absolute cap
