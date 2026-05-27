import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      <Link href="/login" className="inline-flex items-center gap-2.5">
        <BrandMark size={28} />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">
            Outpatient Triage
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            Sunshine Medical Centre · Lagos
          </div>
        </div>
      </Link>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight">
        Privacy notice
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        How Sunshine Medical Centre handles your information when you use the
        Outpatient Triage system.
      </p>

      <div className="mt-8 space-y-5 text-[14px] leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Information we collect
          </h2>
          <p className="mt-2">
            We collect identifying details you provide at registration (name,
            date of birth, sex, contact details), vital signs you measure and
            enter yourself before each triage, and the conversation between
            you and the AI triage assistant. Clinical baseline details such
            as blood group and genotype are added by you on your profile and
            are not required to create an account.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            How we use it
          </h2>
          <p className="mt-2">
            Your information is used to prepare a structured summary for the
            clinician who sees you. It is never used for marketing. The AI
            assistant does not make a diagnosis — it gathers information for a
            licensed clinician to review.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Who can see it
          </h2>
          <p className="mt-2">
            Only the clinician assigned to your case can see clinical content,
            and only while your case is open. Administrative staff who manage
            the queue see your name and arrival time but not clinical detail.
            You can always see your own history.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Storage and processing
          </h2>
          <p className="mt-2">
            While your triage interview is in progress, the conversation is
            held only on the device you are using, so you can pause and resume
            without exposing it to anyone else. When you tap End session, the
            full transcript is sent to Sunshine Medical Centre, encrypted at
            rest, and removed from your device. For this reason we recommend
            using your own phone or laptop rather than a shared device; if you
            must use a shared device, end the session before walking away.
            Conversation content is processed by third-party AI services to
            generate your clinical summary. We will publish a complete list
            of subprocessors before the system goes into production use.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your rights
          </h2>
          <p className="mt-2">
            Under the Nigeria Data Protection Act, you may request access to,
            correction of, or deletion of your personal information held by the
            hospital. Speak to the front desk or email{" "}
            <span className="font-medium">privacy@sunshine.med.ng</span>.
          </p>
        </section>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        This page is a placeholder for the Phase 1 prototype. The production
        notice will replace it before the system is used with real patient
        data.
      </p>
    </div>
  );
}
