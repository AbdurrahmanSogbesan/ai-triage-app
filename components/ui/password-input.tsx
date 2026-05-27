"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "./input";
import { cn } from "@/lib/utils";

/**
 * Password input with a show/hide toggle. Spreads all input props (including
 * the ref RHF's register() passes) through to the underlying Input, so it
 * drops in wherever `<Input type="password" />` was being used.
 */
function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative">
      <Input
        type={shown ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        onClick={() => setShown((s) => !s)}
        className="absolute top-1/2 right-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {shown ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
