import "server-only";

// Published list prices as of 2026-Q1 — verify against
//   https://ai.google.dev/pricing
//   https://groq.com/pricing
// before relying on these figures for invoicing forecasts.
const PRICING_USD_PER_M_TOKENS = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "openai/gpt-oss-120b": { input: 0.15, output: 0.6 },
} as const;

export type LoggedModel = keyof typeof PRICING_USD_PER_M_TOKENS;

type UsageLike = {
  inputTokens?: number;
  outputTokens?: number;
};

/**
 * Logs token counts + estimated USD cost for a single LLM call to the server
 * console, so a session's real token spend is visible while testing. Safe to
 * leave enabled — one console.log per AI call is negligible overhead.
 */
export function logUsage(
  label: string,
  model: LoggedModel,
  usage: UsageLike | undefined | null,
): void {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const price = PRICING_USD_PER_M_TOKENS[model];
  const cost =
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output;
  console.log(
    `[ai-usage] ${label} (${model}): in=${inputTokens.toLocaleString()} out=${outputTokens.toLocaleString()} ≈ $${cost.toFixed(5)}`,
  );
}
