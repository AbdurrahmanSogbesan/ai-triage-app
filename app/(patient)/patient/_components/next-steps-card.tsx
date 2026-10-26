import {
  ClipboardCheck,
  LoaderCircle,
  Siren,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { LatestNextSteps } from "./actions";
import { RefreshWhilePreparing } from "./refresh-while-preparing";

export function NextStepsCard({ latest }: { latest: LatestNextSteps }) {
  const { steps, complaint } = latest;

  return (
    <section aria-labelledby="next-steps-heading">
      <div className="mb-2.5 flex items-baseline justify-between gap-3 px-0.5">
        <h2 id="next-steps-heading" className="shrink-0 text-[13px] font-semibold">
          Your next steps
        </h2>
        <span className="min-w-0 truncate text-[12px] text-muted-foreground">
          {complaint}
        </span>
      </div>

      {steps.kind === "preparing" && (
        <Panel aria-live="polite">
          <IconBadge>
            <LoaderCircle className="h-4.5 w-4.5 animate-spin motion-reduce:animate-none" />
          </IconBadge>
          <div className="min-w-0">
            <p className="text-[15px] font-medium">Reviewing your answers</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Your next steps will appear here, usually within a minute.
            </p>
          </div>
          <RefreshWhilePreparing until={steps.refreshUntil} />
        </Panel>
      )}

      {steps.kind === "go-now" && (
        <div className="flex flex-col gap-2.5">
          <GoNowAlert />
          <p className="px-0.5 text-[12.5px] text-muted-foreground">
            A clinician will also review your answers.
          </p>
        </div>
      )}

      {steps.kind === "review" && (
        <div className="rounded-xl border border-border bg-white p-4 md:p-5">
          <div className="flex items-start gap-3">
            <IconBadge>
              <Stethoscope className="h-4.5 w-4.5" />
            </IconBadge>
            <div className="min-w-0">
              <p className="text-[15px] font-medium">
                A clinician will review your answers
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Your answers are with the clinic team.
              </p>
            </div>
          </div>
          <SafetyNet />
        </div>
      )}

      {steps.kind === "guidance" && (
        <div className="flex flex-col gap-3">
          {steps.goNow && <GoNowAlert />}
          <div className="rounded-xl border border-border bg-white p-4 md:p-5">
            {steps.howSoon && (
              <div className="mb-5 flex items-start gap-3">
                <IconBadge>
                  <ClipboardCheck className="h-4.5 w-4.5" />
                </IconBadge>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold leading-snug tracking-tight">
                    {steps.howSoon}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    Based on the answers you gave.
                  </p>
                </div>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <StepList
                title={steps.goNow ? "On your way" : "While you wait"}
                items={steps.whileYouWait}
              />
              <StepList
                title={
                  steps.goNow
                    ? "Call 112 straight away if"
                    : "Go to the emergency department if"
                }
                items={steps.seekEmergencyCareIf}
                tone="warning"
              />
            </div>
            <p className="mt-5 border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground">
              This guidance is generated automatically from your answers. A
              clinician will still review them.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Panel({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-border bg-white p-4 md:p-5"
      {...props}
    >
      {children}
    </div>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      {children}
    </span>
  );
}

function GoNowAlert() {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-severity-red/30 bg-severity-red-bg p-4 md:p-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-severity-red text-white">
        <Siren className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-snug text-red-950">
          Go to the nearest hospital or call 112 as soon as you can.
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-red-900/80">
          Your answers suggest you need to be seen urgently. Don&apos;t wait
          for the clinic to contact you.
        </p>
      </div>
    </div>
  );
}

function SafetyNet() {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-[12.5px] leading-relaxed text-foreground/85">
      <TriangleAlert className="mt-0.75 h-3.5 w-3.5 shrink-0 text-amber-600" />
      If you feel much worse, or have chest pain, difficulty breathing, heavy
      bleeding or you faint, go to the nearest emergency department or call
      112.
    </p>
  );
}

function StepList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning";
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-[13px] font-medium">{title}</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/85"
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                tone === "warning" ? "bg-severity-red" : "bg-primary",
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
