"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BLOOD_GROUPS,
  GENOTYPES,
  patientBaselineSchema,
  type PatientBaselineInput,
} from "@/lib/schemas/profile";
import { updatePatientBaseline } from "../actions";

// Page passes raw DB text (string | null). DB columns are `text`, not the
// enum, so we defensively narrow here — if a value somehow drifted outside
// the allowed set, fall back to null and let the user re-pick.
type Props = {
  initialBloodGroup: string | null;
  initialGenotype: string | null;
  initialPreferredLanguage: string;
};

// Base UI Select can't hold `null` and renders the raw value in its trigger,
// so we use a user-readable sentinel ("Not specified") for the no-pick row
// and translate it back to null at the RHF boundary. Safe collision-wise —
// no real blood group or genotype shares this label.
const NONE = "Not specified";

function asBloodGroup(v: string | null): PatientBaselineInput["blood_group"] {
  return v && (BLOOD_GROUPS as readonly string[]).includes(v)
    ? (v as PatientBaselineInput["blood_group"])
    : null;
}

function asGenotype(v: string | null): PatientBaselineInput["genotype"] {
  return v && (GENOTYPES as readonly string[]).includes(v)
    ? (v as PatientBaselineInput["genotype"])
    : null;
}

export function BaselineEditor({
  initialBloodGroup,
  initialGenotype,
  initialPreferredLanguage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PatientBaselineInput>({
    resolver: standardSchemaResolver(patientBaselineSchema),
    defaultValues: {
      blood_group: asBloodGroup(initialBloodGroup),
      genotype: asGenotype(initialGenotype),
      preferred_language: initialPreferredLanguage,
    },
  });

  const onSubmit = (values: PatientBaselineInput) => {
    startTransition(async () => {
      const result = await updatePatientBaseline(values);
      if ("error" in result) {
        toast.error("Couldn't save", { description: result.error });
        return;
      }
      toast.success("Profile updated");
      // Re-fetches the layout + page so the read-only display above reflects
      // what we just saved.
      router.refresh();
    });
  };

  return (
    <Card className="mt-5 gap-0 py-0">
      <CardContent className="px-5 py-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <h2 className="text-[14px] font-medium">Clinical baseline</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Used by your triage interview. Optional — you can fill these in any time.
            </p>
          </div>

          <FieldGroup>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel>Blood group</FieldLabel>
                <FieldContent>
                  <Controller
                    control={control}
                    name="blood_group"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? NONE}
                        onValueChange={(v) =>
                          field.onChange(v === NONE ? null : v)
                        }
                      >
                        <SelectTrigger
                          aria-invalid={errors.blood_group ? true : undefined}
                          className="w-full"
                        >
                          <SelectValue placeholder="Not specified" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Not specified</SelectItem>
                          {BLOOD_GROUPS.map((bg) => (
                            <SelectItem key={bg} value={bg}>
                              {bg}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.blood_group && (
                    <FieldError>{errors.blood_group.message}</FieldError>
                  )}
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Genotype</FieldLabel>
                <FieldContent>
                  <Controller
                    control={control}
                    name="genotype"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? NONE}
                        onValueChange={(v) =>
                          field.onChange(v === NONE ? null : v)
                        }
                      >
                        <SelectTrigger
                          aria-invalid={errors.genotype ? true : undefined}
                          className="w-full"
                        >
                          <SelectValue placeholder="Not specified" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Not specified</SelectItem>
                          {GENOTYPES.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.genotype && (
                    <FieldError>{errors.genotype.message}</FieldError>
                  )}
                </FieldContent>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="preferred_language">
                Preferred language
              </FieldLabel>
              <FieldContent>
                <Input
                  id="preferred_language"
                  placeholder="en"
                  maxLength={8}
                  aria-invalid={errors.preferred_language ? true : undefined}
                  {...register("preferred_language")}
                />
                <FieldDescription>
                  ISO code. Use &lsquo;en&rsquo;, &lsquo;yo&rsquo;,{" "}
                  &lsquo;ig&rsquo;, &lsquo;ha&rsquo;, or &lsquo;pcm&rsquo; for
                  Pidgin.
                </FieldDescription>
                {errors.preferred_language && (
                  <FieldError>{errors.preferred_language.message}</FieldError>
                )}
              </FieldContent>
            </Field>
          </FieldGroup>

          <div className="mt-5 flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
