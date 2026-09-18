"use client";

import { format, parseISO } from "date-fns";
import { AlertTriangle, Clock, RefreshCw, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AiTriageCaveat } from "@/components/clinical/ai-triage-caveat";
import { ConfidenceInline } from "@/components/clinical/confidence-indicator";
import { SeverityBadge } from "@/components/clinical/severity-badge";
import { StatusBadge } from "@/components/clinical/status-badge";
import { cn, shortReportId } from "@/lib/utils";
import type { Case, Clinician, Severity } from "@/lib/types";

import { assignCaseAction } from "./actions";

type Props = {
  cases: Case[];
  clinicians: Clinician[];
};

type QueueRow = {
  id: string;
  patientId: string;
  name: string;
  age: number;
  sex: "M" | "F";
  arrivedAt: string;
  waitedMin: number;
  assignedTo: string | null;
  status: Case["status"];
  aiSeverity: Severity | null;
  confidence: number;
};

type Bucket = "all" | "unassigned" | "assigned";

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function drInitials(name: string) {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

function formatArrivedAt(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d · HH:mm");
  } catch {
    return iso;
  }
}

// Wait time only applies while a case is unassigned and the AI is done with
// it — assigned cases are off the admin's queue, and in-progress ones are
// still mid-interview rather than "waiting."
function waitingDisplay(
  row: Pick<QueueRow, "assignedTo" | "status" | "waitedMin">,
) {
  if (row.assignedTo)
    return { label: "—", tone: "default" as const, alert: false };
  if (row.status === "in_progress")
    return { label: "In session", tone: "default" as const, alert: false };
  const alert = row.waitedMin > 60;
  const tone = row.waitedMin > 90 ? "danger" : alert ? "warn" : "default";
  return { label: `${row.waitedMin}m`, tone, alert };
}

export function AdminQueue({ cases, clinicians }: Props) {
  const router = useRouter();
  const [isAssigning, startAssignTransition] = useTransition();

  // Derived from `cases` every render (not a useState copy) so router.refresh() lands.
  const baseQueue = useMemo<QueueRow[]>(
    () =>
      cases.map((c) => ({
        id: c.id,
        patientId: c.patientId,
        name: c.name,
        age: c.age,
        sex: c.sex,
        arrivedAt: c.arrivedAt,
        waitedMin: c.waitedMin,
        assignedTo: c.assignedTo,
        status: c.status,
        aiSeverity: c.aiSeverity ?? null,
        confidence: c.confidence,
      })),
    [cases],
  );
  const [queue, applyOptimisticAssign] = useOptimistic(
    baseQueue,
    (rows, update: { id: string; assignedTo: string }) =>
      rows.map((r) =>
        r.id === update.id ? { ...r, assignedTo: update.assignedTo } : r,
      ),
  );
  const [assigning, setAssigning] = useState<QueueRow | null>(null);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [isRefreshing, startRefreshTransition] = useTransition();

  const handleRefresh = () => {
    startRefreshTransition(() => {
      router.refresh();
    });
  };

  const stats = useMemo(
    () => ({
      total: queue.length,
      unassigned: queue.filter((q) => !q.assignedTo).length,
      withClinician: queue.filter(
        (q) => q.assignedTo && q.status !== "awaiting_referee",
      ).length,
      pendingReferee: queue.filter((q) => q.status === "awaiting_referee")
        .length,
    }),
    [queue],
  );

  const filtered = useMemo(() => {
    if (bucket === "unassigned") return queue.filter((q) => !q.assignedTo);
    if (bucket === "assigned") return queue.filter((q) => !!q.assignedTo);
    return queue;
  }, [queue, bucket]);

  const handleAssign = (clinicianId: string, clinicianName: string) => {
    if (!assigning) return;
    const target = assigning;
    startAssignTransition(async () => {
      // Reverts on its own if assignCaseAction fails below.
      applyOptimisticAssign({ id: target.id, assignedTo: clinicianName });

      const result = await assignCaseAction(target.id, clinicianId);
      if ("error" in result) {
        toast.error("Could not assign", { description: result.error });
        return;
      }
      setAssigning(null);
      toast.success(`Assigned to ${clinicianName}`, {
        description: `${target.name} has been routed.`,
      });
      router.refresh();
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-5 py-6 md:px-8 md:py-7">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Triage queue
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Manage patient flow and assign completed triages to clinicians.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-fit gap-1.5"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="In queue" value={stats.total} />
        <StatCard
          label="Unassigned"
          value={stats.unassigned}
          hint="Awaiting clinician"
          tone="warn"
        />
        <StatCard label="With clinician" value={stats.withClinician} />
        <StatCard
          label="Pending referee"
          value={stats.pendingReferee}
          hint="Awaiting AI verification"
          tone="info"
        />
      </div>

      {/* Mobile segmented bucket switcher (design's AdminQueuePhone pattern) */}
      <div
        className="flex items-center gap-1 rounded-lg bg-muted p-1 md:hidden"
        role="tablist"
        aria-label="Filter patients"
      >
        <SegmentedBucket
          active={bucket === "all"}
          onClick={() => setBucket("all")}
          label="All"
          count={queue.length}
        />
        <SegmentedBucket
          active={bucket === "unassigned"}
          onClick={() => setBucket("unassigned")}
          label="Unassigned"
          count={stats.unassigned}
        />
        <SegmentedBucket
          active={bucket === "assigned"}
          onClick={() => setBucket("assigned")}
          label="Assigned"
          count={stats.withClinician + stats.pendingReferee}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="gap-0 overflow-hidden py-0">
          {/* "Today's patients" header bar — desktop only; mobile uses the
              segmented bucket switcher above instead. */}
          <div className="hidden items-center justify-between border-b border-border px-5 py-3 md:flex">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold">
                Today&apos;s patients
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-foreground/70">
                {queue.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <BucketBtn
                active={bucket === "all"}
                onClick={() => setBucket("all")}
              >
                All
              </BucketBtn>
              <BucketBtn
                active={bucket === "unassigned"}
                onClick={() => setBucket("unassigned")}
              >
                Unassigned
              </BucketBtn>
              <BucketBtn
                active={bucket === "assigned"}
                onClick={() => setBucket("assigned")}
              >
                Assigned
              </BucketBtn>
            </div>
          </div>

          <CardContent className="px-0 py-0">
            {/* Desktop table — min-width forces horizontal scroll on narrow desktops */}
            <Table className="hidden min-w-[920px] md:table">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-9 pl-5 pr-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    Patient
                  </TableHead>
                  <TableHead className="h-9 w-[170px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      AI triage
                      <AiTriageCaveat />
                    </span>
                  </TableHead>
                  <TableHead className="h-9 w-[104px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    Arrived
                  </TableHead>
                  <TableHead className="h-9 w-[124px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    Waiting
                  </TableHead>
                  <TableHead className="h-9 w-[200px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    Assignment
                  </TableHead>
                  <TableHead className="h-9 w-[104px] px-4 text-right text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="sr-only">Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const waiting = waitingDisplay(row);
                  return (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      <TableCell className="py-3 pl-5 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11.5px] font-medium">
                            {initials(row.name)}
                          </span>
                          <div className="flex flex-col leading-tight">
                            <span className="text-[13.5px] font-medium">
                              {row.name}
                            </span>
                            <span className="text-[11.5px] text-muted-foreground">
                              {row.age}, {row.sex === "M" ? "Male" : "Female"} ·{" "}
                              <span className="font-mono">
                                {shortReportId(row.id)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <AiTriageCell
                          aiSeverity={row.aiSeverity}
                          confidence={row.confidence}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] tabular-nums text-foreground/80">
                        {formatArrivedAt(row.arrivedAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-mono text-[13px] font-medium tabular-nums",
                              waiting.tone === "danger"
                                ? "text-red-700"
                                : waiting.tone === "warn"
                                  ? "text-amber-700"
                                  : "text-foreground/80",
                            )}
                          >
                            {waiting.label}
                          </span>
                          {waiting.alert && (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {row.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10.5px] font-medium text-primary">
                              {drInitials(row.assignedTo)}
                            </span>
                            <span className="text-[13px] text-foreground/80">
                              {row.assignedTo}
                            </span>
                            {row.status === "awaiting_referee" && (
                              <span className="rounded px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700 ring-1 ring-amber-200 bg-amber-50">
                                Referee
                              </span>
                            )}
                          </div>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {row.assignedTo ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAssigning(row)}
                          >
                            Reassign
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setAssigning(row)}>
                            Assign
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Mobile cards */}
            <ul className="flex flex-col divide-y divide-border md:hidden">
              {filtered.map((row) => {
                const waiting = waitingDisplay(row);
                return (
                  <li key={row.id} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-medium">
                        {initials(row.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium leading-tight">
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {row.age}, {row.sex === "M" ? "Male" : "Female"} ·{" "}
                          <span className="font-mono">
                            {shortReportId(row.id)}
                          </span>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {row.aiSeverity ? (
                            <>
                              <SeverityBadge level={row.aiSeverity} />
                              {/* No column header on mobile — the caveat
                                  rides with the badge instead. */}
                              <AiTriageCaveat />
                              <ConfidenceInline score={row.confidence} />
                            </>
                          ) : (
                            <PendingTriageChip />
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {formatArrivedAt(row.arrivedAt)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-mono text-[11.5px] font-medium tabular-nums",
                              waiting.tone === "danger"
                                ? "text-red-700"
                                : waiting.tone === "warn"
                                  ? "text-amber-700"
                                  : "text-foreground/80",
                            )}
                          >
                            {waiting.alert && (
                              <AlertTriangle className="h-2.5 w-2.5" />
                            )}
                            {waiting.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                      {row.assignedTo ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10.5px] font-medium text-primary">
                            {drInitials(row.assignedTo)}
                          </span>
                          <span className="truncate text-[12.5px] text-foreground/80">
                            {row.assignedTo}
                          </span>
                        </div>
                      ) : (
                        <StatusBadge status={row.status} />
                      )}
                      {row.assignedTo ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssigning(row)}
                        >
                          Reassign
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setAssigning(row)}>
                          Assign
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-4">
          <ClinicianLoadCard clinicians={clinicians} />
        </aside>
      </div>

      <AssignDialog
        clinicians={clinicians}
        assigning={assigning}
        onCancel={() => setAssigning(null)}
        onAssign={handleAssign}
        isPending={isAssigning}
      />
    </div>
  );
}

// "Pending" until the interview finishes and the SOAP lands.
function AiTriageCell({
  aiSeverity,
  confidence,
}: {
  aiSeverity: Severity | null;
  confidence: number;
}) {
  if (!aiSeverity) return <PendingTriageChip />;
  return (
    <div className="flex flex-col items-start gap-1.5">
      <SeverityBadge level={aiSeverity} />
      <ConfidenceInline score={confidence} />
    </div>
  );
}

function PendingTriageChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
        aria-hidden="true"
      />
      Pending
    </span>
  );
}

function SegmentedBucket({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-white text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
          active
            ? "bg-muted text-foreground/80"
            : "bg-muted-foreground/15 text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function BucketBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded px-2 py-1 text-[12px] font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "warn" | "info";
}) {
  const toneText = {
    default: "text-foreground",
    warn: "text-amber-700",
    info: "text-blue-700",
  };
  return (
    <Card>
      <CardContent className="px-5 py-4">
        <p className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1.5 font-mono text-[28px] font-semibold leading-none tracking-tight tabular-nums",
            toneText[tone],
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-[11.5px] text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ClinicianLoadCard({ clinicians }: { clinicians: Clinician[] }) {
  return (
    <Card>
      <CardContent className="px-5 py-5">
        <h3 className="mb-3.5 text-[13px] font-semibold">Clinician load</h3>
        <ul className="flex flex-col gap-3.5">
          {clinicians.map((c) => {
            const pct = Math.min(100, Math.round((c.load / c.capacity) * 100));
            const tone =
              pct >= 90
                ? "bg-red-500"
                : pct >= 75
                  ? "bg-amber-500"
                  : "bg-primary";
            return (
              <li key={c.id}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[12.5px] font-medium">{c.name}</span>
                  <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
                    {c.load}
                    <span className="text-muted-foreground/70">
                      /{c.capacity}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", tone)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 border-t border-border pt-3.5 text-[11.5px] leading-relaxed text-muted-foreground">
          Current caseload per clinician, out of their capacity. Use this to
          decide who to route a case to when assigning manually.
        </p>
      </CardContent>
    </Card>
  );
}

const FALLBACK_SPECIALITY = "General Practice";

function groupBySpeciality(clinicians: Clinician[]) {
  const groups = new Map<string, Clinician[]>();
  for (const c of clinicians) {
    const key = c.speciality?.trim() || FALLBACK_SPECIALITY;
    const bucket = groups.get(key);
    if (bucket) bucket.push(c);
    else groups.set(key, [c]);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b));
}

function AssignDialog({
  assigning,
  clinicians,
  onAssign,
  onCancel,
  isPending,
}: {
  assigning: QueueRow | null;
  clinicians: Clinician[];
  onAssign: (clinicianId: string, clinicianName: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const lightest = useMemo(() => {
    return [...clinicians].sort(
      (a, b) => a.load / a.capacity - b.load / b.capacity,
    )[0];
  }, [clinicians]);

  const grouped = useMemo(() => groupBySpeciality(clinicians), [clinicians]);
  const [selected, setSelected] = useState<string | undefined>(lightest?.id);
  const selectedClinician = clinicians.find((c) => c.id === selected);

  return (
    <Dialog
      open={assigning !== null}
      onOpenChange={(o) => {
        if (!o && !isPending) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {assigning ? `Assign ${assigning.name}` : "Assign"}
            </span>
          </DialogTitle>
          <DialogDescription>
            Pick a clinician for this case. The patient and AI summary will be
            made available to them immediately.
          </DialogDescription>
        </DialogHeader>
        {assigning && (
          <div className="flex flex-col gap-4">
            {grouped.map(([speciality, members]) => (
              <section key={speciality}>
                <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {speciality}
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {members.map((c) => {
                    const pct = Math.round((c.load / c.capacity) * 100);
                    const on = selected === c.id;
                    const tone =
                      pct >= 90
                        ? "bg-red-500"
                        : pct >= 75
                          ? "bg-amber-500"
                          : "bg-primary";
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(c.id)}
                          aria-pressed={on}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                            on
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-foreground/20 hover:bg-muted/60",
                          )}
                        >
                          <span
                            className={cn(
                              "h-4 w-4 shrink-0 rounded-full border-2",
                              on
                                ? "border-primary bg-primary"
                                : "border-border bg-white",
                            )}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13.5px] font-medium">
                              {c.name}
                            </div>
                            <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                              Current load · {c.load}/{c.capacity}
                            </div>
                          </div>
                          <div className="w-20 shrink-0">
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn("h-full rounded-full", tone)}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              selectedClinician &&
              onAssign(selectedClinician.id, selectedClinician.name)
            }
            disabled={!selectedClinician || isPending}
          >
            {isPending ? "Assigning…" : "Assign case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
