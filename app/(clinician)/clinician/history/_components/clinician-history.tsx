"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SeverityBadge } from "@/components/clinical/severity-badge";
import { ConfidenceInline } from "@/components/clinical/confidence-indicator";
import { cn, shortReportId } from "@/lib/utils";
import type { Case, Severity } from "@/lib/types";

const SEVERITY_BG: Record<Severity, string> = {
  red: "bg-severity-red",
  orange: "bg-severity-orange",
  yellow: "bg-severity-yellow",
  green: "bg-severity-green",
  blue: "bg-severity-blue",
};

function reviewedLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function ClinicianHistory({ cases }: { cases: Case[] }) {
  if (cases.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
        <PageHeader count={0} />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-sm font-medium">No completed cases yet</p>
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Once you confirm or override a case on the dashboard, it will
              move here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-6 md:px-8 md:py-7">
      <PageHeader count={cases.length} />

      <Card className="hidden py-0 md:block">
        <CardContent className="px-0 py-0">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className="h-9 w-[6px] p-0" aria-hidden="true" />
                <TableHead className="h-9 pl-3 pr-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                  Patient
                </TableHead>
                <TableHead className="h-9 px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                  Chief complaint
                </TableHead>
                <TableHead className="h-9 w-[180px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                  Final triage
                </TableHead>
                <TableHead className="h-9 w-[220px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                  AI confidence
                </TableHead>
                <TableHead className="h-9 w-[150px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                  Reviewed
                </TableHead>
                <TableHead className="h-9 w-[110px]">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <HistoryRow key={c.id} caseRow={c} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ul className="flex flex-col gap-2 md:hidden">
        {cases.map((c) => (
          <li key={c.id}>
            <HistoryCardMobile caseRow={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageHeader({ count }: { count: number }) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h1 className="text-[22px] font-semibold tracking-tight">History</h1>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-foreground/70">
          {count}
        </span>
      </div>
      <p className="text-[13.5px] text-muted-foreground">
        Cases you&apos;ve completed. Read-only.
      </p>
    </header>
  );
}

function HistoryRow({ caseRow }: { caseRow: Case }) {
  const router = useRouter();
  const overridden = isOverridden(caseRow);
  return (
    <TableRow
      className="group cursor-pointer transition-colors hover:bg-muted/40"
      onClick={() => router.push(`/clinician/case/${caseRow.id}`)}
    >
      <td className="p-0">
        <Link
          href={`/clinician/case/${caseRow.id}`}
          className={cn("block h-12 w-[3px]", SEVERITY_BG[caseRow.severity])}
          aria-hidden="true"
        />
      </td>
      <TableCell className="py-3 pl-3 pr-4">
        <Link
          href={`/clinician/case/${caseRow.id}`}
          className="flex flex-col leading-tight"
        >
          <span className="text-[13.5px] font-medium">{caseRow.name}</span>
          <span className="text-[11.5px] text-muted-foreground">
            {caseRow.age}, {caseRow.sex === "M" ? "Male" : "Female"} ·{" "}
            <span className="font-mono">{shortReportId(caseRow.id)}</span>
          </span>
        </Link>
      </TableCell>
      <TableCell className="max-w-[340px] px-4 py-3">
        <Link
          href={`/clinician/case/${caseRow.id}`}
          className="block max-w-[320px] truncate text-[13px] text-foreground/80"
          title={caseRow.complaint}
        >
          {caseRow.complaint}
        </Link>
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="flex flex-col items-start gap-1">
          <SeverityBadge level={caseRow.severity} />
          {overridden && (
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-amber-700">
              Overrode AI
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        <ConfidenceInline score={caseRow.confidence} />
      </TableCell>
      <TableCell className="px-4 py-3 text-[12.5px] text-muted-foreground">
        {reviewedLabel(caseRow.reviewedAt)}
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <Link href={`/clinician/case/${caseRow.id}`}>
          <Button type="button" variant="outline" size="sm" className="gap-1">
            View
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}

function HistoryCardMobile({ caseRow }: { caseRow: Case }) {
  const overridden = isOverridden(caseRow);
  return (
    <Link
      href={`/clinician/case/${caseRow.id}`}
      className="relative block overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-foreground/20 active:bg-muted/40"
    >
      <span
        className={cn(
          "absolute bottom-0 left-0 top-0 w-1",
          SEVERITY_BG[caseRow.severity],
        )}
        aria-hidden="true"
      />
      <div className="py-3.5 pl-4 pr-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium leading-tight">
              {caseRow.name}
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {caseRow.age}, {caseRow.sex === "M" ? "Male" : "Female"} ·{" "}
              <span className="font-mono">{shortReportId(caseRow.id)}</span> ·{" "}
              {reviewedLabel(caseRow.reviewedAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SeverityBadge level={caseRow.severity} />
            {overridden && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-amber-700">
                Overrode
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-foreground/80">
          {caseRow.complaint}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <ConfidenceInline score={caseRow.confidence} />
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-primary">
            View
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function isOverridden(caseRow: Case): boolean {
  return Boolean(
    caseRow.aiSeverity &&
      caseRow.clinicianSeverity &&
      caseRow.aiSeverity !== caseRow.clinicianSeverity,
  );
}
