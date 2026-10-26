import type { Metadata } from "next";

import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Sign in — Outpatient Triage",
};

// Set by proxy.ts (expired) and /auth/confirm (confirm_failed, profile_failed).
const REASON_NOTICES: Record<string, string> = {
  expired: "Your session timed out. Sign in again to continue.",
  confirm_failed:
    "That confirmation link is invalid or has already been used. If you've already confirmed, just sign in.",
  profile_failed:
    "Your email is confirmed, but we couldn't finish setting up your account. Sign in to try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const notice = reason ? REASON_NOTICES[reason] : undefined;

  return (
    <div className="w-full max-w-100">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Welcome back. Sign in with your hospital credentials to continue.
        </p>
      </div>
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-border bg-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground/90"
        >
          {notice}
        </p>
      )}
      <LoginForm />
    </div>
  );
}
