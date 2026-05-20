import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { confidenceBand } from "@/lib/types";

const TONE_CLASSES = {
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  warn: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    ring: "ring-amber-200",
  },
  danger: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    bar: "bg-red-500",
    ring: "ring-red-200",
  },
} as const;

const BAND_ICON = {
  success: CheckCircle2,
  warn: Info,
  danger: AlertTriangle,
} as const;

type Props = {
  score: number;
  showLabel?: boolean;
  className?: string;
};

/** Compact inline chip — used in tables and rows. */
export function ConfidenceIndicator({
  score,
  showLabel = true,
  className,
}: Props) {
  const { label, tone } = confidenceBand(score);
  const styles = TONE_CLASSES[tone];
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
        {score}
      </span>
      {showLabel && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
            styles.bg,
            styles.text
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", styles.dot)}
            aria-hidden="true"
          />
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Inline cell for table rows: number + tiny progress bar + tone-icon + label.
 * Matches the design's `ConfidenceInline` shape.
 */
export function ConfidenceInline({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const { label, tone } = confidenceBand(score);
  const styles = TONE_CLASSES[tone];
  const Icon = BAND_ICON[tone];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex w-[68px] items-center gap-2">
        <span className="w-8 font-mono text-sm font-medium tabular-nums">
          {score}%
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", styles.bar)}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[12px]",
          styles.text
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">{label}</span>
      </span>
    </div>
  );
}

/**
 * Prominent header block — used on case-detail patient strip.
 * Matches the design's `ConfidenceBand` shape.
 */
export function ConfidenceBand({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const { label, tone } = confidenceBand(score);
  const styles = TONE_CLASSES[tone];
  const Icon = BAND_ICON[tone];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 ring-1",
        styles.bg,
        styles.ring,
        className
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          styles.text
        )}
        aria-hidden="true"
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          AI confidence
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-semibold tabular-nums">
            {score}%
          </span>
          <span className={cn("text-[13px] font-medium", styles.text)}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
