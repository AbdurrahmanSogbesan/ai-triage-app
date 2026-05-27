"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Link from "next/link";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { login } from "../../actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginInput) => {
    startTransition(async () => {
      const result = await login(values);
      if (result?.error) {
        toast.error("Couldn't sign in", { description: result.error });
      }
    });
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="px-6 py-2">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <FieldContent>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@sunshine.med.ng"
                    aria-invalid={errors.email ? true : undefined}
                    {...register("email")}
                  />
                  {errors.email && (
                    <FieldError>{errors.email.message}</FieldError>
                  )}
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <FieldContent>
                  <PasswordInput
                    id="password"
                    autoComplete="current-password"
                    placeholder="Enter password"
                    aria-invalid={errors.password ? true : undefined}
                    {...register("password")}
                  />
                  {errors.password && (
                    <FieldError>{errors.password.message}</FieldError>
                  )}
                </FieldContent>
              </Field>
            </FieldGroup>

            <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
              <Checkbox id="remember" defaultChecked />
              <label htmlFor="remember" className="cursor-pointer select-none">
                Keep me signed in
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Signing in…" : "Sign in"}
            </Button>

            <p className="text-center text-[13px] text-muted-foreground">
              New patient?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Register here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-[11.5px] leading-relaxed text-muted-foreground">
        For technical issues, contact IT support at ext. 4501.
      </p>
    </>
  );
}
