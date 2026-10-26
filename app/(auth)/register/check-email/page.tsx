import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Check your email — Outpatient Triage",
};

export default function CheckEmailPage() {
  return (
    <div className="w-full max-w-100">
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center px-6 py-4 text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We&apos;ve sent a confirmation link to the address you registered
            with. Open it to activate your account — you&apos;ll be signed in
            automatically.
          </p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
            Nothing after a few minutes? Check your spam folder.
          </p>
          <Link
            href="/login"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "mt-6 w-full",
            })}
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
