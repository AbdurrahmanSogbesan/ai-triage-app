import {
  Clock,
  Heart,
  Scale,
  Thermometer,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Vitals } from "@/lib/types";

type Tone = "default" | "warn" | "bad";

const TONE_CLASSES: Record<
  Tone,
  { iconBg: string; iconFg: string }
> = {
  default: { iconBg: "bg-muted", iconFg: "text-muted-foreground" },
  warn: { iconBg: "bg-amber-50", iconFg: "text-amber-700" },
  bad: { iconBg: "bg-red-50", iconFg: "text-red-700" },
};

function bpTone(sys: number, dia: number): Tone {
  if (sys >= 160 || dia >= 100) return "bad";
  if (sys >= 140 || dia >= 90) return "warn";
  if (sys < 90 || dia < 60) return "warn";
  return "default";
}

function tempTone(t: number): Tone {
  if (t >= 39 || t < 35) return "bad";
  if (t >= 37.8) return "warn";
  return "default";
}

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  tone?: Tone;
  className?: string;
};

export function VitalChip({
  icon: Icon,
  label,
  value,
  unit,
  tone = "default",
  className,
}: Props) {
  const styles = TONE_CLASSES[tone];
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2",
        className
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          styles.iconBg,
          styles.iconFg
        )}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="whitespace-nowrap font-mono text-[13.5px] font-medium tabular-nums">
          {value}
          <span className="ml-0.5 font-sans text-[11.5px] font-normal text-muted-foreground">
            {unit}
          </span>
        </span>
      </div>
    </div>
  );
}

export function VitalsStrip({
  vitals,
  takenAgo,
  className,
}: {
  vitals: Vitals;
  takenAgo?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2",
        className
      )}
    >
      <VitalChip
        icon={Heart}
        label="BP"
        value={`${vitals.bpSys}/${vitals.bpDia}`}
        unit="mmHg"
        tone={bpTone(vitals.bpSys, vitals.bpDia)}
      />
      <VitalChip
        icon={Thermometer}
        label="Temp"
        value={vitals.tempC.toFixed(1)}
        unit="°C"
        tone={tempTone(vitals.tempC)}
      />
      <VitalChip
        icon={Scale}
        label="Weight"
        value={`${vitals.weightKg}`}
        unit="kg"
      />
      {takenAgo && (
        <VitalChip icon={Clock} label="Taken" value={takenAgo} unit="ago" />
      )}
    </div>
  );
}
