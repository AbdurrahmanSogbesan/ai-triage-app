"use client";

import { AlertTriangle } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

const BANDS = [
  { range: "85–100", meaning: "High confidence" },
  { range: "75–84", meaning: "Verify carefully" },
  { range: "0–74", meaning: "Manual review recommended" },
];

/** Explains what an AI triage level is — and isn't — to a non-clinical reader. */
export function AiTriageCaveat({ className }: { className?: string }) {
  return (
    <HoverCard>
      <HoverCardTrigger
        render={<button type="button" />}
        aria-label="About AI triage levels"
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-600 transition-colors hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="flex w-[290px] flex-col gap-3 p-3.5"
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-semibold">
            Provisional — not a clinical judgement
          </p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            These Manchester Triage System levels come from the AI interview and
            an automated referee score. No clinician has confirmed them.
          </p>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Use them to order the queue, not to make clinical decisions. The
          reviewing clinician can change the level.
        </p>
        <div className="border-t border-border pt-2.5">
          <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            Confidence
          </p>
          <dl className="flex flex-col gap-1">
            {BANDS.map((band) => (
              <div key={band.range} className="flex items-baseline gap-2">
                <dt className="w-[52px] shrink-0 font-mono text-[11.5px] tabular-nums text-foreground/80">
                  {band.range}
                </dt>
                <dd className="text-[11.5px] text-muted-foreground">
                  {band.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
