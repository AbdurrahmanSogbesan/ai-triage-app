// No-op stand-in for the `server-only` package.
//
// The real `server-only` module throws at import time unless it is loaded
// inside Next's React Server bundle. The AI modules in `lib/ai/` start with
// `import "server-only"` to guarantee they never ship to the browser. The
// evaluation harness runs them headlessly under Node (tsx), where that guard
// would otherwise crash on import. This stub is mapped in place of the package
// via `evaluation/tsconfig.json` paths — ONLY for the harness, so the app's
// real build keeps the genuine server-only protection.
export {};
