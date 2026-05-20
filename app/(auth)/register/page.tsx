import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RegisterForm } from "./_components/register-form";

export const metadata: Metadata = {
  title: "Create your account — Outpatient Triage",
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-130">
      <Link
        href="/login"
        className="-ml-1.5 mb-3 inline-flex items-center gap-1 rounded px-1.5 py-1 text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>

      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Tell us a bit about yourself. This is the information your clinician
          will see at intake.
        </p>
      </div>

      <RegisterForm />

      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-muted-foreground">
        Staff don&apos;t register here — clinician and admin accounts are
        created by the hospital IT team.
      </p>
    </div>
  );
}
