import { format, parseISO } from "date-fns";
import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { SoapReport } from "@/lib/types";
import { SEVERITY_META } from "@/lib/types";

function SoapSection({
  letter,
  title,
  children,
  className,
}: {
  letter: "S" | "O" | "A" | "P";
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid grid-cols-1 gap-3 py-5 md:grid-cols-[140px_1fr] md:gap-6",
        className,
      )}
    >
      <div className="flex md:flex-col">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-[15px] font-semibold text-primary"
          aria-hidden="true"
        >
          {letter}
        </span>
        <h3 className="ml-3 self-center text-[13.5px] font-semibold md:ml-0 md:mt-2.5 md:self-start">
          {title}
        </h3>
      </div>
      <div className="text-[13.5px] leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}

const KV_COLS = {
  wide: "grid-cols-[110px_1fr] md:grid-cols-[168px_1fr]",
  compact: "grid-cols-[110px_1fr] md:grid-cols-[128px_1fr]",
} as const;

type KvCols = keyof typeof KV_COLS;

function ListKv({
  k,
  items,
  cols = "wide",
}: {
  k: string;
  items: string[];
  cols?: KvCols;
}) {
  return (
    <div className={cn("grid gap-3 py-1.5", KV_COLS[cols])}>
      <dt className="text-[12.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {k}
      </dt>
      <dd className="text-[13.5px] text-foreground/90">
        {items.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

function Kv({ k, v, cols = "wide" }: { k: string; v: string; cols?: KvCols }) {
  return (
    <div className={cn("grid gap-3 py-1.5", KV_COLS[cols])}>
      <dt className="text-[12.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {k}
      </dt>
      <dd className="text-[13.5px] text-foreground/90">{v}</dd>
    </div>
  );
}

// The SOAP schema stores blood_pressure as a free-text string. Gemini
// sometimes emits "138/88", sometimes "138/88 mmHg". Strip any trailing
// unit so the panel can render a single, consistent "<value> mmHg".
function formatBloodPressure(raw: string): string {
  return raw.replace(/\s*mmHg\s*$/i, "").trim();
}

function nonEmpty(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function SoapPanel({ soap }: { soap: SoapReport }) {
  const generatedAgo = (() => {
    try {
      return format(parseISO(soap.metadata.generated_at), "PPpp");
    } catch {
      return soap.metadata.generated_at;
    }
  })();

  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-6 py-1">
        <SoapSection letter="S" title="Subjective">
          <p className="mb-3 font-medium text-foreground">
            {soap.subjective.chief_complaint}
          </p>
          <p>{soap.subjective.history_of_present_illness}</p>
          <dl className="mt-4 divide-y divide-border">
            <ListKv
              k="Associated"
              items={soap.subjective.associated_symptoms}
            />
            <ListKv
              k="Past Medical History"
              items={soap.subjective.past_medical_history}
            />
            <ListKv
              k="Medications"
              items={soap.subjective.current_medications}
            />
            <ListKv k="Allergies" items={soap.subjective.allergies} />
            <Kv k="Social" v={nonEmpty(soap.subjective.social_history)} />
          </dl>
        </SoapSection>

        <Separator />

        <SoapSection letter="O" title="Objective">
          {soap.objective.general_observations && (
            <p className="mb-3 font-medium text-foreground">
              {soap.objective.general_observations}
            </p>
          )}
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <Kv
              k="Blood Pressure"
              cols="compact"
              v={`${formatBloodPressure(soap.objective.vitals.blood_pressure)} mmHg`}
            />
            <Kv
              k="Temperature"
              cols="compact"
              v={`${soap.objective.vitals.temperature_celsius.toFixed(1)} °C`}
            />
            <Kv
              k="Weight"
              cols="compact"
              v={`${soap.objective.vitals.weight_kg.toFixed(1)} kg`}
            />
          </dl>
        </SoapSection>

        <Separator />

        <SoapSection letter="A" title="Assessment">
          <p className="mb-1 font-medium text-foreground">
            {SEVERITY_META[soap.assessment.triage_level].label} ·{" "}
            {SEVERITY_META[soap.assessment.triage_level].meaning}
          </p>
          <p className="mb-3 text-[12.5px] text-muted-foreground">
            MTS chart applied: {soap.assessment.mts_chart_used}
          </p>
          <p className="mb-3">{soap.assessment.rationale}</p>
          {soap.assessment.discriminators_triggered.length > 0 && (
            <div>
              <p className="mb-2 text-[12.5px] font-medium uppercase tracking-wider text-muted-foreground">
                Discriminators triggered
              </p>
              <ul className="flex flex-col gap-2">
                {soap.assessment.discriminators_triggered.map((d, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    <span className="text-[13.5px] font-medium">{d.name}</span>
                    <span className="text-[12.5px] text-muted-foreground">
                      Evidence: {d.evidence}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SoapSection>

        <Separator />

        <SoapSection letter="P" title="Plan">
          <p className="mb-2 text-[12.5px] font-medium uppercase tracking-wider text-muted-foreground">
            Next steps
          </p>
          <ol className="mb-4 flex flex-col gap-2">
            {soap.plan.next_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] font-medium tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {soap.plan.red_flags_to_monitor.length > 0 && (
            <>
              <p className="mb-2 text-[12.5px] font-medium uppercase tracking-wider text-muted-foreground">
                Red flags to monitor
              </p>
              <ul className="flex flex-col gap-1.5">
                {soap.plan.red_flags_to_monitor.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SoapSection>
      </CardContent>

      <div className="flex items-center justify-between rounded-b-xl border-t border-border bg-muted/30 px-6 py-3">
        <div className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Generated {generatedAgo} · {soap.metadata.model}
        </div>
        <div className="hidden text-[12px] text-muted-foreground md:block">
          Always verify against patient context.
        </div>
      </div>
    </Card>
  );
}
