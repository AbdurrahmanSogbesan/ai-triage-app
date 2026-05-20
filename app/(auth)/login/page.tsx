import type { Metadata } from "next";

import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Sign in — Outpatient Triage",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-100">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Welcome back. Sign in with your hospital credentials to continue.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
