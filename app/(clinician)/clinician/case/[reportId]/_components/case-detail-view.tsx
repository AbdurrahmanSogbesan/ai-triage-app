"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { commitCaseReviewAction } from "@/app/(clinician)/clinician/_components/actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn, shortReportId } from "@/lib/utils";
import {
  SEVERITY_META,
  type Case,
  type Severity,
  type SoapReport,
  type TranscriptTurn,
} from "@/lib/types";
import {
  formatDistanceToNow,
  parseISO,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  format,
} from "date-fns";
import { SeverityBadge } from "@/components/clinical/severity-badge";
import { StatusBadge } from "@/components/clinical/status-badge";
import { ConfidenceBand } from "@/components/clinical/confidence-indicator";
import { VitalsStrip } from "@/components/clinical/vital-chip";

import { SoapPanel } from "./soap-panel";
import { TranscriptPanel } from "./transcript-panel";
import { OverridePanel } from "./override-panel";

// Base UI Tabs writes `data-active` on the active trigger. The shadcn
// primitive ships its own `::after` underline (positioned bottom-[-5px],
// bg-foreground) — we hide it via the group-data variant selector below
// and use a proper <TabsIndicator /> span inside the TabsList instead,
// which auto-tracks the active tab via base-ui's `--active-tab-*` vars.
const TRIGGER_BASE = cn(
  "rounded-none text-muted-foreground data-active:text-foreground",
  "group-data-[variant=line]/tabs-list:data-active:after:opacity-0",
);

const TRIGGER_DESKTOP = cn(
  TRIGGER_BASE,
  "flex-none gap-2 px-4 py-2.5 text-sm font-medium",
);

const TRIGGER_MOBILE = cn(
  TRIGGER_BASE,
  // Full-width stretch on mobile — each tab takes an equal third of the row.
  // Same py-2.5 as desktop so the gap between the icon/label and the underline
  // is consistent across breakpoints. The wrapper's pt-4 supplies the
  // breathing room above the tabs row.
  "flex-1 gap-1.5 px-3 py-2.5 text-[13px] font-medium",
);

export type AuditEntry = {
  at: string | null;
  actor: string;
  what: string;
};

type Props = {
  caseRow: Case;
  soap: SoapReport;
  transcript: TranscriptTurn[];
  audit: AuditEntry[];
};

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function CaseDetailView({ caseRow, soap, transcript, audit }: Props) {
  const router = useRouter();
  const initials = getInitials(caseRow.name);
  const displayId = shortReportId(caseRow.id);

  // Hoisted override state — shared between OverridePanel and the mobile
  // sticky commit bar so both reflect the same level/reason at once.
  const [overrideLevel, setOverrideLevel] = useState<Severity>(
    caseRow.severity,
  );
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [committed, setCommitted] = useState(caseRow.status === "completed");

  const isOverride = overrideLevel !== caseRow.severity;
  // A completed case is a historical record — wait timers, "taken Xh ago"
  // vitals chips, and the "Active cases" back-link are all stale concepts.
  // The view collapses to: clinical content + when the case was reviewed.
  const isCompleted = caseRow.status === "completed";
  const backHref = isCompleted ? "/clinician/history" : "/clinician";
  const backLabel = isCompleted ? "History" : "Active cases";

  const handleLevelChange = (level: Severity) => {
    setOverrideLevel(level);
    if (reasonError) setReasonError(null);
  };

  const handleReasonChange = (next: string) => {
    setReason(next);
    if (reasonError) setReasonError(null);
  };

  const handleSubmit = async () => {
    if (isOverride && reason.trim().length < 10) {
      setReasonError(
        "Give at least 10 characters of context when overriding the AI label.",
      );
      return;
    }
    setReasonError(null);
    setIsSubmitting(true);
    const result = await commitCaseReviewAction(
      caseRow.id,
      overrideLevel,
      reason,
    );
    setIsSubmitting(false);
    if ("error" in result) {
      toast.error("Could not save review", { description: result.error });
      return;
    }
    setCommitted(true);
    toast.success(isOverride ? "Override submitted" : "Case marked complete", {
      description: isOverride
        ? "Your decision has been logged and the patient is being called."
        : "Patient is being called.",
    });
    // Re-fetch the page's server data so the case header reflects the new
    // status (and the dashboard count drops by one when the clinician
    // navigates back).
    router.refresh();
  };

  return (
    <>
      {/* MOBILE LAYOUT */}
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col md:hidden">
        <header className="sticky top-14 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-white px-3">
          <Link
            href={backHref}
            aria-label={`Back to ${backLabel.toLowerCase()}`}
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">Case {displayId}</div>
            <div className="text-[11px] text-muted-foreground">
              {backLabel}
            </div>
          </div>
          <span className="ml-auto">
            <SeverityBadge level={caseRow.severity} />
          </span>
        </header>

        <Tabs defaultValue="soap" className="flex flex-1 flex-col gap-0">
          <section className="border-b border-border bg-white px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-[14px] font-medium">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15.5px] font-semibold leading-tight">
                  {caseRow.name}
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {caseRow.age}, {caseRow.sex === "M" ? "Male" : "Female"} ·{" "}
                  <span className="font-mono">{displayId}</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/85">
              {caseRow.complaint}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SeverityBadge level={caseRow.severity} showMeaning />
              <StatusBadge status={caseRow.status} />
              <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {isCompleted
                  ? `Reviewed ${formatRelative(caseRow.reviewedAt ?? null)}`
                  : `${caseRow.waitedMin}m`}
              </span>
            </div>
            <div className="mt-3.5">
              <ConfidenceBand score={caseRow.confidence} />
            </div>
          </section>

          <section className="border-b border-border bg-white px-4 py-4">
            <h2 className="mb-2 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Vitals on arrival
            </h2>
            <VitalsStrip
              vitals={caseRow.vitals}
              takenAgo={
                isCompleted
                  ? undefined
                  : formatShort(caseRow.vitals.recordedAt ?? null)
              }
              className="grid-cols-2"
            />
          </section>

          {/* Sticky wrapper: pt-4 gives the tabs row generous breathing room
              above; pb-0 keeps the active underline flush with the border-b. */}
          <TabsList
            variant="line"
            className="sticky top-26 z-10 h-11.25! w-full justify-stretch gap-0 rounded-none border-b border-border bg-background px-4 pb-0 pt-4"
          >
            <TabsTrigger value="soap" className={TRIGGER_MOBILE}>
              <FileText className="h-[14px] w-[14px]" />
              SOAP
            </TabsTrigger>
            <TabsTrigger value="transcript" className={TRIGGER_MOBILE}>
              <MessageSquare className="h-[14px] w-[14px]" />
              Transcript
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums">
                {transcript.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="override" className={TRIGGER_MOBILE}>
              <Edit3 className="h-[14px] w-[14px]" />
              Override
            </TabsTrigger>
            <TabsIndicator />
          </TabsList>

          <div className="flex-1 px-4 py-4 pb-24">
            <TabsContent value="soap" className="m-0">
              <SoapPanel soap={soap} />
            </TabsContent>
            <TabsContent value="transcript" className="m-0">
              <TranscriptPanel
                transcript={transcript}
                status={caseRow.status}
              />
            </TabsContent>
            <TabsContent value="override" className="m-0">
              {committed ? (
                <CompletedCard
                  reportId={caseRow.id}
                  notes={caseRow.clinicianNotes ?? (reason.trim() || null)}
                />
              ) : (
                <OverridePanel
                  aiLevel={caseRow.severity}
                  confidence={caseRow.confidence}
                  level={overrideLevel}
                  onLevelChange={handleLevelChange}
                  reason={reason}
                  onReasonChange={handleReasonChange}
                  reasonError={reasonError}
                  isOverride={isOverride}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                  renderFooter={false}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Sticky bottom commit bar — reflects the active override choice */}
        {!committed && (
          <div className="sticky bottom-0 z-20 flex shrink-0 items-center gap-3 border-t border-border bg-white px-4 py-3">
            <div className="min-w-0 flex-1 text-[11.5px] leading-tight text-muted-foreground">
              {isOverride ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Overriding · {SEVERITY_META[caseRow.severity].label} →{" "}
                  {SEVERITY_META[overrideLevel].label}
                </span>
              ) : (
                <span>
                  Confirming AI suggestion —{" "}
                  {SEVERITY_META[caseRow.severity].label}.
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              <Check className="h-3.5 w-3.5" />
              {isSubmitting ? "Saving…" : "Confirm"}
            </Button>
          </div>
        )}
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="mx-auto hidden w-full max-w-[1100px] flex-col gap-5 px-5 py-6 md:flex md:px-8 md:py-6">
        <nav className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <Link
            href={backHref}
            className="-ml-1 inline-flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">{displayId}</span>
        </nav>

        <Card className="gap-0 py-0">
          <CardContent className="flex flex-wrap items-start gap-6 px-6 py-5">
            <div className="flex min-w-[300px] flex-1 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-[16px] font-medium">
                {initials}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[20px] font-semibold tracking-tight">
                    {caseRow.name}
                  </h1>
                  <span className="text-[13px] text-muted-foreground">
                    · {caseRow.age}, {caseRow.sex === "M" ? "Male" : "Female"}
                  </span>
                  <span className="ml-1 font-mono text-[12px] text-muted-foreground/70">
                    {displayId}
                  </span>
                </div>
                <p className="mt-1.5 max-w-[600px] text-[13.5px] leading-relaxed text-foreground/80">
                  {caseRow.complaint}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SeverityBadge level={caseRow.severity} showMeaning />
                  <StatusBadge status={caseRow.status} />
                  <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {isCompleted
                      ? `Reviewed ${formatRelative(caseRow.reviewedAt ?? null)}`
                      : `Waiting ${caseRow.waitedMin}m`}
                  </span>
                </div>
              </div>
            </div>
            <div className="min-w-[240px]">
              <ConfidenceBand score={caseRow.confidence} />
            </div>
          </CardContent>

          <CardContent className="px-6 pb-5 pt-0">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vitals on arrival
            </h2>
            <VitalsStrip
              vitals={caseRow.vitals}
              takenAgo={
                isCompleted
                  ? undefined
                  : formatShort(caseRow.vitals.recordedAt ?? null)
              }
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="soap" className="gap-5">
          <TabsList
            variant="line"
            className="h-auto w-fit gap-1 rounded-none border-b border-border bg-transparent p-0"
          >
            <TabsTrigger value="soap" className={TRIGGER_DESKTOP}>
              <FileText className="h-[15px] w-[15px]" />
              SOAP report
            </TabsTrigger>
            <TabsTrigger value="transcript" className={TRIGGER_DESKTOP}>
              <MessageSquare className="h-[15px] w-[15px]" />
              Transcript
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {transcript.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="override" className={TRIGGER_DESKTOP}>
              <Edit3 className="h-[15px] w-[15px]" />
              Override
            </TabsTrigger>
            <TabsIndicator />
          </TabsList>

          <TabsContent value="soap" className="m-0">
            <SoapPanel soap={soap} />
          </TabsContent>
          <TabsContent value="transcript" className="m-0">
            <TranscriptPanel transcript={transcript} status={caseRow.status} />
          </TabsContent>
          <TabsContent value="override" className="m-0">
            {committed ? (
              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <CompletedCard
                  reportId={caseRow.id}
                  notes={caseRow.clinicianNotes ?? (reason.trim() || null)}
                />
                <OverrideSideRail audit={audit} showTips={false} />
              </div>
            ) : (
              <OverridePanel
                aiLevel={caseRow.severity}
                confidence={caseRow.confidence}
                level={overrideLevel}
                onLevelChange={handleLevelChange}
                reason={reason}
                onReasonChange={handleReasonChange}
                reasonError={reasonError}
                isOverride={isOverride}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                sideRail={<OverrideSideRail audit={audit} />}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function CompletedCard({
  reportId,
  notes,
}: {
  reportId: string;
  notes: string | null;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 px-6 py-6">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold">Case completed</span>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Report <span className="font-mono">{shortReportId(reportId)}</span>{" "}
          marked complete. The patient queue has been updated.
        </p>
        {notes && (
          <div className="mt-1 w-full rounded-md border border-border bg-muted/40 px-3.5 py-3">
            <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Clinician note
            </p>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground/85">
              {notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

// Compact time label for tight UI spots (no `ago` suffix):
// - <1 minute => "now"
// - minutes => "Nm"
// - hours => "Nh"
// - days => "Nd"
// - >=7 days => short date like "May 2"
function formatShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    const date = parseISO(iso);
    const mins = differenceInMinutes(new Date(), date);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = differenceInHours(new Date(), date);
    if (hrs < 24) return `${hrs}h`;
    const days = differenceInDays(new Date(), date);
    if (days < 7) return `${days}d`;
    return format(date, "MMM d");
  } catch {
    return iso;
  }
}

function OverrideSideRail({
  audit,
  showTips = true,
}: {
  audit: AuditEntry[];
  showTips?: boolean;
}) {
  return (
    <aside className="flex flex-col gap-4">
      {showTips && (
        <Card>
          <CardContent className="flex flex-col gap-3 px-5 py-5">
            <h3 className="text-[13px] font-semibold">When to override</h3>
            <ul className="flex flex-col gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {[
                "Confidence is below 75% — the AI itself flags it.",
                "New findings on physical exam not reflected in vitals.",
                "Patient history you have access to that the AI does not.",
                "Local protocol differs from the AI's recommendation.",
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {audit.length > 0 && (
        <Card>
          <CardContent className="px-5 py-5">
            <h3 className="mb-3 text-[13px] font-semibold">Audit trail</h3>
            <ol className="relative flex flex-col gap-3 pl-4 before:absolute before:bottom-1.5 before:left-[5px] before:top-1.5 before:w-px before:bg-border">
              {audit.map((entry, i) => (
                <li key={i} className="relative">
                  <span
                    className="absolute top-1 -left-[15px] h-2.5 w-2.5 rounded-full border-2 border-border bg-white"
                    aria-hidden="true"
                  />
                  <div className="text-[12px] font-medium">{entry.what}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatRelative(entry.at)} · {entry.actor}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
