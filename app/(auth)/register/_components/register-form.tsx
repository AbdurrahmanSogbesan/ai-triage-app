"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { mockRegister } from "../../actions";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </div>
  );
}

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: standardSchemaResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dob: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      consent: false,
    },
  });

  const onSubmit = () => {
    startTransition(async () => {
      toast.success("Welcome to Sunshine Medical", {
        description: "Your account is ready. You can sign in now.",
      });
      await mockRegister();
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="px-6 py-2">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-5">
            <SectionHeader title="Personal details" />
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <FieldContent>
                    <Input
                      id="firstName"
                      autoComplete="given-name"
                      placeholder="Adebayo"
                      aria-invalid={errors.firstName ? true : undefined}
                      {...register("firstName")}
                    />
                    {errors.firstName && (
                      <FieldError>{errors.firstName.message}</FieldError>
                    )}
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                  <FieldContent>
                    <Input
                      id="lastName"
                      autoComplete="family-name"
                      placeholder="Ogundimu"
                      aria-invalid={errors.lastName ? true : undefined}
                      {...register("lastName")}
                    />
                    {errors.lastName && (
                      <FieldError>{errors.lastName.message}</FieldError>
                    )}
                  </FieldContent>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="dob">Date of birth</FieldLabel>
                  <FieldContent>
                    <Input
                      id="dob"
                      type="date"
                      aria-invalid={errors.dob ? true : undefined}
                      {...register("dob")}
                    />
                    {errors.dob && (
                      <FieldError>{errors.dob.message}</FieldError>
                    )}
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Sex</FieldLabel>
                  <FieldContent>
                    <Controller
                      control={control}
                      name="sex"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            aria-invalid={errors.sex ? true : undefined}
                            className="w-full"
                          >
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Male</SelectItem>
                            <SelectItem value="F">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.sex && (
                      <FieldError>{errors.sex.message}</FieldError>
                    )}
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </div>

          <Separator />

          <div className="flex flex-col gap-5">
            <SectionHeader title="Contact" />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <FieldContent>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+234 803 555 0142"
                    aria-invalid={errors.phone ? true : undefined}
                    {...register("phone")}
                  />
                  <FieldDescription>
                    We&apos;ll use this for appointment reminders.
                  </FieldDescription>
                  {errors.phone && (
                    <FieldError>{errors.phone.message}</FieldError>
                  )}
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <FieldContent>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={errors.email ? true : undefined}
                    {...register("email")}
                  />
                  {errors.email && (
                    <FieldError>{errors.email.message}</FieldError>
                  )}
                </FieldContent>
              </Field>
            </FieldGroup>
          </div>

          <Separator />

          <div className="flex flex-col gap-5">
            <SectionHeader title="Security" />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <FieldContent>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={errors.password ? true : undefined}
                    {...register("password")}
                  />
                  <FieldDescription>At least 8 characters.</FieldDescription>
                  {errors.password && (
                    <FieldError>{errors.password.message}</FieldError>
                  )}
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm password
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={errors.confirmPassword ? true : undefined}
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <FieldError>{errors.confirmPassword.message}</FieldError>
                  )}
                </FieldContent>
              </Field>
            </FieldGroup>
          </div>

          <Controller
            control={control}
            name="consent"
            render={({ field }) => (
              <div>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <Checkbox
                    id="consent"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-[12.5px] leading-relaxed text-foreground/90">
                    I agree to Sunshine Medical&apos;s{" "}
                    <Link href="/privacy" className="text-primary underline">
                      privacy notice
                    </Link>{" "}
                    and consent to my information being shared with clinicians
                    treating me.
                  </span>
                </label>
                {errors.consent && (
                  <p className="mt-1.5 text-[12px] text-destructive">
                    {errors.consent.message}
                  </p>
                )}
              </div>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-center text-[13px] text-muted-foreground">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
