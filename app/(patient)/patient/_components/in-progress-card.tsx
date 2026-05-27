"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ArrowRight, MessageSquare, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { abandonSessionAction } from "./actions";

type InProgress = {
  id: string;
  complaint: string;
  sessionStartedAt: string;
};

export function InProgressCard({
  session,
  variant = "phone",
}: {
  session: InProgress;
  variant?: "phone" | "desktop";
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const startedAgo = formatDistanceToNow(parseISO(session.sessionStartedAt), {
    addSuffix: true,
  });

  function handleAbandon() {
    startTransition(async () => {
      const result = await abandonSessionAction(session.id);
      setConfirmOpen(false);
      if ("error" in result) {
        toast.error("Could not abandon session", {
          description: result.error,
        });
        return;
      }
      try {
        window.localStorage.removeItem(`triage:transcript:${session.id}`);
      } catch {
        // non-fatal — the session is already marked abandoned server-side
      }
      toast("Session abandoned", {
        description:
          "Your partial responses were not sent. You can start a new triage when you're ready.",
      });
    });
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-white p-4 transition-shadow",
        variant === "desktop" && "p-5 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquare className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 truncate font-medium",
                variant === "desktop" ? "text-[15px]" : "text-[14px]"
              )}
            >
              {session.complaint}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Session options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem
                  onClick={() => setConfirmOpen(true)}
                  className="text-destructive focus:bg-red-50 focus:text-destructive"
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Abandon session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Started {startedAgo}
          </p>
        </div>
        {variant === "desktop" && (
          <Link
            href={`/patient/interview/${session.id}`}
            className="ml-2 shrink-0 self-center"
          >
            <Button size="sm" className="gap-1.5">
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>
      {variant === "phone" && (
        <Link
          href={`/patient/interview/${session.id}`}
          className="mt-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
        >
          Continue where you left off
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Abandon this session?</DialogTitle>
            <DialogDescription>
              Your partial responses won&apos;t be sent to the doctor. You can
              start a new triage at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Keep session
            </Button>
            <Button
              variant="destructive"
              onClick={handleAbandon}
              disabled={isPending}
            >
              {isPending ? "Abandoning…" : "Abandon session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
