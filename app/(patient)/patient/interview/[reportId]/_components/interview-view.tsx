"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Mic,
  Send,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { TranscriptTurn, Vitals } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  reportId: string;
  patientFirstName: string;
  vitals: Vitals;
  complaint: string;
  transcript: TranscriptTurn[];
  state: "start" | "mid" | "end" | "error";
};

const TOTAL_QUESTIONS = 8;

export function InterviewView({
  reportId,
  patientFirstName,
  vitals,
  complaint,
  transcript,
  state,
}: Props) {
  const router = useRouter();
  const [endOpen, setEndOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const answered = transcript.filter((t) => t.role === "patient").length;
  const progress = Math.min(
    100,
    Math.round((answered / TOTAL_QUESTIONS) * 100)
  );

  const confirmEnd = () => {
    setEndOpen(false);
    router.push("/patient");
    toast("Session ended", {
      description: "The doctor will see what you submitted.",
    });
  };

  const handleSend = () => {
    setThinking(true);
    window.setTimeout(() => setThinking(false), 1500);
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-background md:min-h-screen md:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-14 z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-white px-4 md:hidden">
        <Link
          href="/patient"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <button
          type="button"
          onClick={() => setEndOpen(true)}
          className="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          End session
        </button>
      </header>

      {/* Chat column */}
      <div className="flex flex-1 flex-col">
        {/* Desktop top bar with progress strip */}
        <div className="hidden h-14 shrink-0 items-center justify-between border-b border-border bg-white px-6 md:flex">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/patient"
              className="-ml-1.5 inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <span className="h-5 w-px bg-border" />
            <div className="min-w-0 leading-tight">
              <p className="text-[15px] font-semibold">Triage interview</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Session active · ID{" "}
                <span className="font-mono">{reportId}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-[12px] text-muted-foreground md:flex">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {progress}%
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEndOpen(true)}
            >
              End session
            </Button>
          </div>
        </div>

        <ChatScroll
          transcript={transcript}
          state={state}
          thinking={thinking}
        />

        {state === "error" ? (
          <ErrorComposer />
        ) : (
          <Composer disabled={state === "end"} onSend={handleSend} />
        )}
      </div>

      {/* Desktop context rail */}
      <aside className="hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-white p-6 md:flex">
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Patient
          </h3>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-[12.5px] font-medium">
              {patientFirstName.slice(0, 1)}O
            </span>
            <div className="leading-tight">
              <p className="text-[13.5px] font-medium">
                {patientFirstName} Ogundimu
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                Report <span className="font-mono">{reportId}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s vitals
          </h3>
          <ul className="flex flex-col text-[12.5px]">
            <PatientFriendlyVital
              label="Blood pressure"
              value={`${vitals.bpSys}/${vitals.bpDia}`}
              unit="mmHg"
              normal="usually 90–140 / 60–90"
            />
            <PatientFriendlyVital
              label="Temperature"
              value={vitals.tempC.toFixed(1)}
              unit="°C"
              normal="normal 36.1–37.5"
            />
            <PatientFriendlyVital
              label="Weight"
              value={`${vitals.weightKg}`}
              unit="kg"
              normal="self-reported"
            />
          </ul>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
            Recorded by the nurse at intake.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Session progress
          </h3>
          <div className="rounded-xl bg-muted/50 p-3.5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[12.5px] font-medium">
                {answered} of ~{TOTAL_QUESTIONS} questions
              </span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
              When the AI has enough information, it will summarise everything
              for your doctor.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Privacy
          </h3>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Only Dr. Okafor and admitted clinicians at Sunshine Medical can see
            this conversation. It is stored as part of your medical record.
          </p>
        </section>

        <p className="sr-only">
          Chief complaint: {complaint}
        </p>
      </aside>

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>End this session?</DialogTitle>
            <DialogDescription>
              The doctor will only see what you&apos;ve answered so far. You can
              start a new triage at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndOpen(false)}>
              Keep going
            </Button>
            <Button variant="destructive" onClick={confirmEnd}>
              End session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PatientFriendlyVital({
  label,
  value,
  unit,
  normal,
}: {
  label: string;
  value: string;
  unit: string;
  normal: string;
}) {
  return (
    <li className="flex items-baseline justify-between border-b border-border/60 py-1.5 last:border-b-0">
      <div className="flex flex-col">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-[10.5px] text-muted-foreground/70">{normal}</span>
      </div>
      <span className="font-mono font-medium tabular-nums">
        {value}{" "}
        <span className="font-sans font-normal text-muted-foreground/70">
          {unit}
        </span>
      </span>
    </li>
  );
}

function ChatScroll({
  transcript,
  state,
  thinking,
}: {
  transcript: TranscriptTurn[];
  state: Props["state"];
  thinking: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3">
        {state === "start" && (
          <div className="my-2 text-center text-[11.5px] text-muted-foreground/70">
            Session started · just now
          </div>
        )}
        {transcript.map((turn, i) => (
          <Bubble key={i} turn={turn} />
        ))}
        {thinking && <ThinkingBubble />}
        {state === "end" && (
          <>
            <SummaryBubble />
            <ReportSentChip />
          </>
        )}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div
      className="flex max-w-[88%] items-end gap-2 self-start"
      aria-label="Assistant is composing a reply"
    >
      <AiAvatar />
      <div className="rounded-2xl rounded-bl-md border border-border bg-white px-3.5 py-3">
        <div className="flex gap-1">
          <span
            className="chat-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="chat-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="chat-dot h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

function ReportSentChip() {
  return (
    <div className="mx-auto my-3 flex max-w-[95%] items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      <span className="text-[12.5px] font-medium text-emerald-900">
        Report sent to Dr. Okafor
      </span>
    </div>
  );
}

function Bubble({ turn }: { turn: TranscriptTurn }) {
  if (turn.role === "ai") {
    return (
      <div className="flex max-w-[88%] items-end gap-2 self-start">
        <AiAvatar />
        <div className="rounded-2xl rounded-bl-md border border-border bg-white px-3.5 py-2.5 text-[14px] leading-relaxed">
          {turn.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex max-w-[88%] justify-end self-end">
      <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[14px] leading-relaxed text-primary-foreground">
        {turn.text}
      </div>
    </div>
  );
}

function SummaryBubble() {
  return (
    <div className="flex max-w-[88%] items-end gap-2 self-start">
      <AiAvatar />
      <div className="rounded-2xl rounded-bl-md border border-primary/15 bg-primary/5 px-3.5 py-3 text-[14px] leading-relaxed text-foreground">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          Summary for the doctor
        </p>
        Thank you. I have enough to brief the doctor. To summarise: you&apos;ve
        had tight, pressure-like central chest pain for about two hours,
        radiating to your left arm, currently 7/10, with associated sweating
        and nausea. You&apos;re a known hypertensive on lisinopril. The doctor
        will see you shortly. Please stay seated — a nurse is being notified
        now.
      </div>
    </div>
  );
}

function AiAvatar() {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-border"
      aria-hidden="true"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 4l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z"
          fill="var(--color-primary)"
          stroke="var(--color-primary)"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Composer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: () => void;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);

  const send = () => {
    if (!text.trim()) return;
    setText("");
    onSend();
  };

  return (
    <>
      {recording && (
        <div className="flex shrink-0 items-center gap-2.5 border-t border-red-200 bg-red-50 px-4 py-2.5 md:px-8">
          <span className="block h-3 w-3 animate-pulse rounded-full bg-red-600" />
          <span className="flex-1 text-[13px] font-medium text-red-900">
            Recording… speak now
          </span>
          <button
            type="button"
            onClick={() => setRecording(false)}
            className="rounded-md px-2.5 py-1 text-[12.5px] font-medium text-red-700 hover:bg-red-100"
          >
            Stop
          </button>
        </div>
      )}
      <div className="sticky bottom-0 border-t border-border bg-white px-4 py-3 md:px-8 md:py-4">
        <div className="mx-auto flex w-full max-w-[720px] items-end gap-2">
          <div className="flex flex-1 items-end rounded-2xl border border-input bg-white transition-colors focus-within:border-transparent focus-within:ring-2 focus-within:ring-primary">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                disabled ? "Interview complete." : "Type your reply…"
              }
              rows={1}
              disabled={disabled}
              className="block min-h-[44px] max-h-32 w-full resize-none bg-transparent px-4 py-2.5 text-[14.5px] leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            aria-label={recording ? "Stop recording" : "Start voice input"}
            aria-pressed={recording}
            onClick={() => setRecording((r) => !r)}
            disabled={disabled}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              recording
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-muted text-foreground/80 hover:bg-muted/70 disabled:opacity-50"
            )}
          >
            {recording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            aria-label="Send message"
            onClick={send}
            disabled={disabled || text.trim().length === 0}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-[720px] text-center text-[11px] text-muted-foreground">
          Your responses are sent to the doctor before your appointment.
        </p>
      </div>
    </>
  );
}

function ErrorComposer() {
  return (
    <div className="border-t border-amber-200 bg-amber-50 px-4 py-4 md:px-8 md:py-5">
      <div className="mx-auto flex w-full max-w-[720px] items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[13.5px] font-medium text-amber-900">
              Couldn&apos;t reach the assistant
            </p>
            <p className="text-[13px] text-amber-800">
              Your last message wasn&apos;t sent. Tap retry, or let a nurse
              know — they can finish intake with you on paper.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Retry</Button>
            <Button size="sm" variant="outline">
              Notify nurse
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
