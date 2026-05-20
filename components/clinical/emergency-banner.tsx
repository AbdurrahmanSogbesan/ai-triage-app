import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmergencyBanner({ className }: { className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="text-[13px] leading-relaxed">
        <span className="font-medium">If this is an emergency</span>, tell the
        front desk immediately or call <span className="font-mono">112</span>.
        Don&apos;t wait for the AI interview.
      </div>
    </div>
  );
}
