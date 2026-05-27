"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AlertTriangle,
  ArrowLeft,
  Mic,
  Send,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { Vitals } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { endSessionAction } from "@/app/(patient)/patient/_components/actions";

type Props = {
  reportId: string;
  patientFirstName: string;
  vitals: Vitals;
  complaint: string;
};

// Cosmetic only — Gemini decides when the interview concludes. The bar gives
// the patient a rough sense of pacing rather than a strict step count.
const TYPICAL_QUESTION_COUNT = 8;

function transcriptStorageKey(reportId: string): string {
  return `triage:transcript:${reportId}`;
}

function loadStoredMessages(reportId: string): UIMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(transcriptStorageKey(reportId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UIMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function InterviewView({
  reportId,
  patientFirstName,
  vitals,
  complaint,
}: Props) {
  const router = useRouter();
  const [endOpen, setEndOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isEnding, startEndTransition] = useTransition();
  const seededRef = useRef(false);

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
    stop,
    regenerate,
  } = useChat({
    id: reportId,
    transport: new DefaultChatTransport({
      api: "/api/interview/chat",
      body: { reportId },
    }),
  });

  // Hydrate from localStorage on first mount. If we find a saved transcript
  // for this report, restore it (skipping the chief-complaint seed). If not,
  // seed the conversation with the chief complaint as the first user message.
  // Per the privacy advisory, transcripts only live on this device until the
  // patient ends the session; on End Session we encrypt and ship to the DB.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const stored = loadStoredMessages(reportId);
    if (stored) {
      setMessages(stored);
      return;
    }
    sendMessage({ text: complaint });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror in-progress messages into localStorage so a reload (or the
  // Continue button on the dashboard) restores the conversation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (messages.length === 0) return;
    try {
      window.localStorage.setItem(
        transcriptStorageKey(reportId),
        JSON.stringify(messages),
      );
    } catch {
      // quota exceeded / private mode — non-fatal, chat still works in memory
    }
  }, [messages, reportId]);

  const answered = messages.filter((m) => m.role === "user").length;
  const progress = Math.min(
    100,
    Math.round((answered / TYPICAL_QUESTION_COUNT) * 100),
  );

  const isThinking = status === "submitted";
  const isStreaming = status === "streaming";
  const isBusy = isThinking || isStreaming;
  const hasError = status === "error";

  const handleEndSession = () => {
    startEndTransition(async () => {
      const result = await endSessionAction(
        reportId,
        JSON.stringify(messages),
      );
      if ("error" in result) {
        toast.error("Could not end session", { description: result.error });
        return;
      }
      try {
        window.localStorage.removeItem(transcriptStorageKey(reportId));
      } catch {
        // non-fatal
      }
      setEndOpen(false);
      router.push("/patient");
      toast("Session ended", {
        description:
          "We're preparing your summary for the doctor. It will be ready in a moment.",
      });
    });
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  const handleRetry = () => {
    regenerate();
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-background md:h-screen md:flex-row">
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
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Desktop top bar — the right rail owns session progress, so this
            stays focused on identity + navigation + end-session affordance. */}
        <div className="hidden h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-6 md:flex">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/patient"
              className="-ml-1.5 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <span className="h-5 w-px shrink-0 bg-border" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[15px] font-semibold">
                Triage interview
              </p>
              <p className="mt-0.5 hidden items-center gap-1.5 text-[11.5px] text-muted-foreground lg:inline-flex">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                <span className="truncate">
                  Session active · ID{" "}
                  <span className="font-mono">{reportId.slice(0, 8)}</span>
                </span>
              </p>
            </div>
          </div>
          {isStreaming ? (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => stop()}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setEndOpen(true)}
            >
              End session
            </Button>
          )}
        </div>

        <ChatScroll messages={messages} isThinking={isThinking} />

        {hasError ? (
          <ErrorComposer
            message={error?.message ?? "Something went wrong."}
            onRetry={handleRetry}
          />
        ) : (
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={isBusy}
          />
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
              {patientFirstName.slice(0, 1).toUpperCase()}
            </span>
            <div className="leading-tight">
              <p className="text-[13.5px] font-medium">{patientFirstName}</p>
              <p className="text-[11.5px] text-muted-foreground">
                Report <span className="font-mono">{reportId.slice(0, 8)}</span>
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
            You recorded these yourself before starting the interview.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Session progress
          </h3>
          <div className="rounded-xl bg-muted/50 p-3.5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[12.5px] font-medium">
                {answered} of ~{TYPICAL_QUESTION_COUNT} questions
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
            Only your assigned clinician at Sunshine Medical can read this
            conversation. It is stored as part of your medical record.
          </p>
        </section>

        <p className="sr-only">Chief complaint: {complaint}</p>
      </aside>

      <Dialog
        open={endOpen}
        onOpenChange={(o) => {
          if (isEnding) return;
          setEndOpen(o);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>End this session?</DialogTitle>
            <DialogDescription>
              The doctor will only see what you&apos;ve answered so far. You can
              start a new triage at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEndOpen(false)}
              disabled={isEnding}
            >
              Keep going
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndSession}
              disabled={isEnding}
            >
              {isEnding ? "Ending…" : "End session"}
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
  messages,
  isThinking,
}: {
  messages: UIMessage[];
  isThinking: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3">
        <div className="my-2 text-center text-[11.5px] text-muted-foreground/70">
          Session started · just now
        </div>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isThinking && <ThinkingBubble />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
  if (!text) return null;

  if (message.role === "assistant") {
    return (
      <div className="flex max-w-[88%] items-end gap-2 self-start">
        <AiAvatar />
        <div className="rounded-2xl rounded-bl-md border border-border bg-white px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex max-w-[88%] justify-end self-end">
      <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap text-primary-foreground">
        {text}
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
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
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
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Waiting for the assistant…" : "Type your reply…"}
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
                : "bg-muted text-foreground/80 hover:bg-muted/70 disabled:opacity-50",
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
            onClick={onSend}
            disabled={disabled || value.trim().length === 0}
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

function ErrorComposer({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="border-t border-amber-200 bg-amber-50 px-4 py-4 md:px-8 md:py-5">
      <div className="mx-auto flex w-full max-w-[720px] items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[13.5px] font-medium text-amber-900">
              Couldn&apos;t reach the assistant
            </p>
            <p className="text-[13px] text-amber-800">{message}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
            <Button size="sm" variant="outline">
              Get help at the front desk
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
