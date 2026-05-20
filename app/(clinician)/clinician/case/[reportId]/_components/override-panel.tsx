"use client";

import { AlertTriangle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { SeverityBadge } from "@/components/clinical/severity-badge";
import { cn } from "@/lib/utils";
import { SEVERITY_META, type Severity } from "@/lib/types";

const ALL_LEVELS: Severity[] = ["red", "orange", "yellow", "green", "blue"];

const LEVEL_STYLES: Record<
  Severity,
  { dot: string; selected: string; text: string }
> = {
  red: {
    dot: "bg-severity-red",
    selected: "border-severity-red bg-severity-red-bg",
    text: "text-severity-red",
  },
  orange: {
    dot: "bg-severity-orange",
    selected: "border-severity-orange bg-severity-orange-bg",
    text: "text-severity-orange",
  },
  yellow: {
    dot: "bg-severity-yellow",
    selected: "border-severity-yellow bg-severity-yellow-bg",
    text: "text-severity-yellow",
  },
  green: {
    dot: "bg-severity-green",
    selected: "border-severity-green bg-severity-green-bg",
    text: "text-severity-green",
  },
  blue: {
    dot: "bg-severity-blue",
    selected: "border-severity-blue bg-severity-blue-bg",
    text: "text-severity-blue",
  },
};

type Props = {
  aiLevel: Severity;
  confidence: number;
  level: Severity;
  onLevelChange: (level: Severity) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  reasonError: string | null;
  isOverride: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  /** Mobile uses an external sticky commit bar; desktop renders its own. */
  renderFooter?: boolean;
  sideRail?: React.ReactNode;
};

export function OverridePanel({
  aiLevel,
  confidence,
  level,
  onLevelChange,
  reason,
  onReasonChange,
  reasonError,
  isOverride,
  isSubmitting,
  onSubmit,
  renderFooter = true,
  sideRail,
}: Props) {
  return (
    <div
      className={cn(
        "grid gap-5",
        sideRail && "lg:grid-cols-[1fr_320px]"
      )}
    >
      <Card className="gap-0 py-0">
        <CardContent className="px-6 py-5">
          <h3 className="text-[14.5px] font-semibold">Adjust triage level</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            The AI suggested{" "}
            <SeverityBadge level={aiLevel} className="align-middle" /> based on
            the interview and vitals. You can override this if your clinical
            judgement differs.
          </p>

          <div className="mt-5 rounded-xl border border-border bg-muted/50 px-4 py-3.5">
            <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
              AI suggestion
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <SeverityBadge level={aiLevel} showMeaning />
              <span className="font-mono text-[12.5px] tabular-nums text-muted-foreground">
                Confidence {confidence}%
              </span>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[13px] font-medium">
              Your decision
              <span className="ml-0.5 text-destructive">*</span>
            </p>
            <div
              role="radiogroup"
              aria-label="Triage level"
              className="flex gap-2"
            >
              {ALL_LEVELS.map((l) => {
                const meta = SEVERITY_META[l];
                const styles = LEVEL_STYLES[l];
                const on = level === l;
                return (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onLevelChange(l)}
                    className={cn(
                      "flex flex-1 flex-col items-center rounded-lg border-2 px-2 py-3 text-center text-[12.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on
                        ? cn(styles.selected, "shadow-sm")
                        : "border-transparent bg-muted/40 hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "mb-2 h-2 w-2 rounded-full",
                        styles.dot
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "leading-tight",
                        on ? styles.text : "text-foreground"
                      )}
                    >
                      {meta.label}
                    </span>
                    <span
                      className={cn(
                        "mt-1 text-[10.5px] leading-tight",
                        on ? styles.text : "text-muted-foreground"
                      )}
                    >
                      {meta.meaning}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[12px] text-muted-foreground">
              {isOverride
                ? "You're overriding the AI suggestion — a brief reason is required below."
                : "Keep as suggested, or pick a different level."}
            </p>
          </div>

          <div className="mt-5">
            <Field>
              <FieldLabel htmlFor="override-reason">
                {isOverride ? "Reason for override" : "Notes (optional)"}
                {isOverride && (
                  <span className="ml-0.5 text-destructive">*</span>
                )}
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="override-reason"
                  rows={4}
                  value={reason}
                  onChange={(e) => onReasonChange(e.target.value)}
                  placeholder={
                    isOverride
                      ? "e.g. ECG ordered; symptom presentation more consistent with acute MI than AI assessment."
                      : "Optional notes…"
                  }
                  aria-invalid={reasonError ? true : undefined}
                />
                {!isOverride && (
                  <FieldDescription>
                    Add a clinical note if you want it stored with the report.
                  </FieldDescription>
                )}
                {reasonError && <FieldError>{reasonError}</FieldError>}
              </FieldContent>
            </Field>
          </div>
        </CardContent>

        {renderFooter && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-border bg-muted/30 px-6 py-4">
            <div className="text-[12.5px] text-muted-foreground">
              {isOverride ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  Override will be logged with your name.
                </span>
              ) : (
                <span>
                  No override · keeping {SEVERITY_META[aiLevel].label}.
                </span>
              )}
            </div>
            <Button
              type="button"
              className="gap-1.5"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              <Check className="h-3.5 w-3.5" />
              {isSubmitting ? "Saving…" : "Confirm & mark complete"}
            </Button>
          </div>
        )}
      </Card>

      {sideRail}
    </div>
  );
}
