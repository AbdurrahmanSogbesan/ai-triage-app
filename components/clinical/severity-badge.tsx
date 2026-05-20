import { cn } from "@/lib/utils";
import { SEVERITY_META, type Severity } from "@/lib/types";

const SEVERITY_CLASSES: Record<
  Severity,
  { bg: string; text: string; dot: string }
> = {
  red: {
    bg: "bg-severity-red-bg",
    text: "text-severity-red",
    dot: "bg-severity-red",
  },
  orange: {
    bg: "bg-severity-orange-bg",
    text: "text-severity-orange",
    dot: "bg-severity-orange",
  },
  yellow: {
    bg: "bg-severity-yellow-bg",
    text: "text-severity-yellow",
    dot: "bg-severity-yellow",
  },
  green: {
    bg: "bg-severity-green-bg",
    text: "text-severity-green",
    dot: "bg-severity-green",
  },
  blue: {
    bg: "bg-severity-blue-bg",
    text: "text-severity-blue",
    dot: "bg-severity-blue",
  },
};

type Props = {
  level: Severity;
  showMeaning?: boolean;
  className?: string;
};

export function SeverityBadge({
  level,
  showMeaning = false,
  className,
}: Props) {
  const meta = SEVERITY_META[level];
  const styles = SEVERITY_CLASSES[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles.bg,
        styles.text,
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", styles.dot)}
        aria-hidden="true"
      />
      <span>{meta.label}</span>
      {showMeaning && (
        <span className="opacity-80">· {meta.meaning}</span>
      )}
    </span>
  );
}

export function SeverityBar({
  level,
  className,
}: {
  level: Severity;
  className?: string;
}) {
  const styles = SEVERITY_CLASSES[level];
  return <span className={cn("block w-[3px]", styles.dot, className)} />;
}
