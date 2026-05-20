"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ArrowRight, Info, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Controller,
  useForm,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { ME_PATIENT_ACTIVE_CASE_ID } from "@/lib/data/mock-cases";
import {
  chiefComplaintSchema,
  vitalsSchema,
  type ChiefComplaintInput,
  type VitalsInput,
} from "@/lib/schemas/clinical";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Step = "idle" | "vitals" | "complaint" | "submitting";

const PREFILL_PHRASES = {
  Pain: "I have pain in my ",
  Fever: "I've had a fever for ",
  Cough: "I've been coughing for ",
  Injury: "I injured my ",
  Dizziness: "I've been feeling dizzy since ",
  Other: "",
} as const;

const MAX_COMPLAINT = 300;

export function StartTriageFlow({
  variant = "default",
}: {
  variant?: "default" | "block";
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");

  const closeAll = () => setStep("idle");
  const start = () => setStep("vitals");

  return (
    <>
      {variant === "block" ? (
        <button
          type="button"
          onClick={start}
          aria-label="Start a new triage session"
          className="flex w-full min-h-[64px] items-center justify-between gap-3 rounded-xl bg-primary px-5 py-4 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[16.5px] font-semibold">Start triage</span>
            <span className="mt-0.5 text-[12.5px] font-normal opacity-85">
              Takes about 5 minutes
            </span>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <ArrowRight className="h-5 w-5" />
          </span>
        </button>
      ) : (
        <Button size="lg" className="gap-2" onClick={start}>
          <Stethoscope className="h-4 w-4" />
          Start triage
        </Button>
      )}

      <VitalsModal
        open={step === "vitals"}
        onCancel={closeAll}
        onSubmit={() => {
          setStep("complaint");
          toast.success("Vitals saved", {
            description: "Just one more step before we begin.",
          });
        }}
      />

      <ChiefComplaintModal
        open={step === "complaint"}
        onBack={() => setStep("vitals")}
        onCancel={closeAll}
        onSubmit={() => {
          setStep("submitting");
          router.push(
            `/patient/interview/${ME_PATIENT_ACTIVE_CASE_ID}?state=start`,
          );
        }}
      />
    </>
  );
}

function VitalsModal({
  open,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onSubmit: (values: VitalsInput) => void;
  onCancel: () => void;
}) {
  const form = useForm<VitalsInput>({
    resolver: standardSchemaResolver(vitalsSchema),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
  } = form;

  const handleClose = () => {
    // Only prompt to discard when the user has actually typed a value somewhere.
    // `isDirty` from RHF fires too eagerly for our case.
    const values = getValues();
    const hasValue = Object.values(values).some(
      (v) => typeof v === "number" && !Number.isNaN(v)
    );
    if (hasValue && !confirm("Discard these readings?")) return;
    reset();
    onCancel();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record today&apos;s vitals</DialogTitle>
          <DialogDescription>
            Please enter the readings the nurse took for you at intake.
            You&apos;ll only need to do this once today.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((v) => {
            onSubmit(v);
            reset();
          })}
          className="flex flex-col gap-5"
          noValidate
        >
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <VitalRow
                id="bpSys"
                label="Systolic"
                placeholder="120"
                unit="mmHg"
                helper="Top number · usually 90–140"
                reg={register("bpSys", { valueAsNumber: true })}
                error={errors.bpSys?.message}
              />
              <VitalRow
                id="bpDia"
                label="Diastolic"
                placeholder="80"
                unit="mmHg"
                helper="Bottom number · usually 60–90"
                reg={register("bpDia", { valueAsNumber: true })}
                error={errors.bpDia?.message}
              />
              <VitalRow
                id="tempC"
                label="Temperature"
                placeholder="37.0"
                step="0.1"
                unit="°C"
                helper="Normal · 36.1–37.5 °C"
                reg={register("tempC", { valueAsNumber: true })}
                error={errors.tempC?.message}
              />
              <VitalRow
                id="weightKg"
                label="Weight"
                placeholder="70"
                step="0.1"
                unit="kg"
                helper="Recent reading is fine"
                reg={register("weightKg", { valueAsNumber: true })}
                error={errors.weightKg?.message}
              />
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Save &amp; continue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VitalRow({
  id,
  label,
  placeholder,
  unit,
  helper,
  step,
  reg,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  unit: string;
  helper: string;
  step?: string;
  reg: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        <span className="ml-0.5 text-destructive">*</span>
      </FieldLabel>
      <FieldContent>
        <div
          className={cn(
            "flex items-stretch overflow-hidden rounded-lg border bg-white transition-shadow",
            "focus-within:border-transparent focus-within:ring-2 focus-within:ring-primary",
            error ? "border-destructive/50" : "border-input"
          )}
        >
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            step={step ?? "1"}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            {...reg}
            className="h-10 rounded-none border-0 bg-transparent px-3 font-mono text-[15px] tabular-nums shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <span className="flex items-center border-l border-input bg-muted px-3 text-[12px] font-medium text-muted-foreground">
            {unit}
          </span>
        </div>
        {error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <FieldDescription>{helper}</FieldDescription>
        )}
      </FieldContent>
    </Field>
  );
}

function ChiefComplaintModal({
  open,
  onSubmit,
  onBack,
  onCancel,
}: {
  open: boolean;
  onSubmit: (values: ChiefComplaintInput) => void;
  onBack: () => void;
  onCancel: () => void;
}) {
  const form = useForm<ChiefComplaintInput>({
    resolver: standardSchemaResolver(chiefComplaintSchema),
    defaultValues: { complaint: "" },
  });
  const {
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
    reset,
  } = form;

  const complaint = watch("complaint") ?? "";

  const handleClose = () => {
    if (isDirty && !confirm("Discard what you've written?")) return;
    reset();
    onCancel();
  };

  const insertPrefill = (label: keyof typeof PREFILL_PHRASES) => {
    const phrase = PREFILL_PHRASES[label];
    setValue("complaint", getValues("complaint") + phrase, {
      shouldDirty: true,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>What brings you in today?</DialogTitle>
          <DialogDescription>
            In a sentence or two, tell us how you&apos;re feeling. The doctor
            will see this before your appointment.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((v) => {
            onSubmit(v);
            reset();
          })}
          className="flex flex-col gap-4"
          noValidate
        >
          <Field>
            <FieldContent>
              <Controller
                control={control}
                name="complaint"
                render={({ field }) => (
                  <Textarea
                    {...field}
                    autoFocus
                    rows={4}
                    maxLength={MAX_COMPLAINT}
                    placeholder="e.g. I've had chest pain for the past two hours, and it goes into my left arm."
                    aria-invalid={errors.complaint ? true : undefined}
                    className="text-[15px] leading-relaxed"
                  />
                )}
              />
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <p className="text-[12px] text-muted-foreground">
                  Write in plain words. Your assistant will ask follow-up
                  questions.
                </p>
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    complaint.length > MAX_COMPLAINT - 20
                      ? "text-amber-600"
                      : "text-muted-foreground/60",
                  )}
                >
                  {complaint.length}/{MAX_COMPLAINT}
                </span>
              </div>
              {errors.complaint && (
                <FieldError>{errors.complaint.message}</FieldError>
              )}
            </FieldContent>
          </Field>

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Not sure where to start? Tap one
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                Object.keys(PREFILL_PHRASES) as Array<
                  keyof typeof PREFILL_PHRASES
                >
              ).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => insertPrefill(label)}
                  className="h-9 rounded-full border border-border bg-muted/40 px-3 text-[12.5px] font-medium text-foreground/80 transition-colors hover:border-foreground/20 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Don&apos;t worry about getting it perfect — the assistant will ask
              follow-up questions to fill in the details.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onBack}>
              Back
            </Button>
            <Button type="submit">Start interview</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
