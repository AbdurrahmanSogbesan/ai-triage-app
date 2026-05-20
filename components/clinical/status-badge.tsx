import { cn } from "@/lib/utils";
import { STATUS_META, type SessionStatus } from "@/lib/types";

const TONE_CLASSES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-50 text-blue-700",
  warn: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
} as const;

type Props = {
  status: SessionStatus;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[meta.tone],
        className
      )}
    >
      {meta.label}
    </span>
  );
}
