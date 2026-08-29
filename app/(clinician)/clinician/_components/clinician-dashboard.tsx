"use client";

import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { cn, shortReportId } from "@/lib/utils";
import type { Case, Severity } from "@/lib/types";
import { SEVERITY_META } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const ALL_LEVELS: Severity[] = ["red", "orange", "yellow", "green", "blue"];

const SEVERITY_ORDER: Record<Severity, number> = {
  red: 0,
  orange: 1,
  yellow: 2,
  green: 3,
  blue: 4,
};

const SEVERITY_BG: Record<Severity, string> = {
  red: "bg-severity-red",
  orange: "bg-severity-orange",
  yellow: "bg-severity-yellow",
  green: "bg-severity-green",
  blue: "bg-severity-blue",
};

type SortKey = "severity" | "name" | "complaint" | "confidence" | "wait";
type SortDir = "asc" | "desc";

type FilterValue = "all" | Severity;

export function ClinicianDashboard({ cases }: { cases: Case[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, startRefreshTransition] = useTransition();

  const handleRefresh = () => {
    startRefreshTransition(() => {
      router.refresh();
    });
  };

  // Skeleton placeholder while the "fetch" settles — matches design (900ms).
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = {
      red: 0,
      orange: 0,
      yellow: 0,
      green: 0,
      blue: 0,
    };
    for (const row of cases) c[row.severity]++;
    return c;
  }, [cases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (filter !== "all" && c.severity !== filter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.complaint.toLowerCase().includes(q)
      );
    });
  }, [cases, query, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "severity":
          return (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) * dir;
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "complaint":
          return a.complaint.localeCompare(b.complaint) * dir;
        case "confidence":
          return (b.confidence - a.confidence) * dir;
        case "wait":
          return (b.waitedMin - a.waitedMin) * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const isFiltering = filter !== "all" || query.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-6 md:px-8 md:py-7">
      {/* Page header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight">
              Active cases
            </h1>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-foreground/70">
              {cases.length}
            </span>
          </div>
          <p className="text-[13.5px] text-muted-foreground">
            Cases assigned to you, ordered by severity. Updated 2 minutes ago.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search name or complaint"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-[260px] pl-8 text-[13px]"
              aria-label="Search cases"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
            />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </header>

      {/* Filter chips — "All" + 5 severity levels */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Filter by severity"
      >
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
          count={cases.length}
        />
        {ALL_LEVELS.map((level) => (
          <FilterChip
            key={level}
            active={filter === level}
            onClick={() => setFilter(level)}
            label={SEVERITY_META[level].label}
            count={counts[level]}
            dot={SEVERITY_BG[level]}
          />
        ))}
        {isFiltering && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="ml-1 text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Cases table / cards */}
      {!loading && sorted.length === 0 ? (
        <EmptyState filtered={isFiltering} />
      ) : (
        <>
          {/* Desktop: shadcn Table — auto wraps in overflow-x-auto + min-width on the inner table forces horizontal scroll on narrow desktops/tablets */}
          <Card className="hidden py-0 md:block">
            <CardContent className="px-0 py-0">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-9 w-[6px] p-0" aria-hidden="true" />
                    <SortableHead
                      label="Patient"
                      active={sortKey === "name"}
                      dir={sortDir}
                      onClick={() => toggleSort("name")}
                      className="pl-3 pr-4"
                    />
                    <SortableHead
                      label="Chief complaint"
                      active={sortKey === "complaint"}
                      dir={sortDir}
                      onClick={() => toggleSort("complaint")}
                    />
                    <SortableHead
                      label="Severity"
                      active={sortKey === "severity"}
                      dir={sortDir}
                      onClick={() => toggleSort("severity")}
                      className="w-[150px]"
                    />
                    <SortableHead
                      label="AI confidence"
                      active={sortKey === "confidence"}
                      dir={sortDir}
                      onClick={() => toggleSort("confidence")}
                      className="w-[240px]"
                    />
                    <SortableHead
                      label="Waiting"
                      active={sortKey === "wait"}
                      dir={sortDir}
                      onClick={() => toggleSort("wait")}
                      className="w-[110px]"
                    />
                    <TableHead className="h-9 w-[110px]">
                      <span className="sr-only">Action</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <CaseRowSkeleton key={i} />
                      ))
                    : sorted.map((c) => <CaseRow key={c.id} caseRow={c} />)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile: stacked CaseCard list — design's ClinicianDashboardPhone pattern */}
          <ul className="flex flex-col gap-2 md:hidden">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <li key={i}>
                    <CaseCardSkeleton />
                  </li>
                ))
              : sorted.map((c) => (
                  <li key={c.id}>
                    <CaseCardMobile caseRow={c} />
                  </li>
                ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active
          ? "bg-foreground text-background"
          : "border border-border bg-white text-foreground/80 hover:border-foreground/20 hover:bg-muted"
      )}
    >
      {dot && (
        <span
          className={cn("h-2 w-2 rounded-full", dot)}
          aria-hidden="true"
        />
      )}
      {label}
      <span
        className={cn(
          "-mr-1 rounded px-1.5 py-0.5 text-[11.5px] tabular-nums",
          active ? "text-background/70" : "text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-9 px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground",
        className
      )}
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "-ml-0.5 inline-flex items-center gap-1 rounded px-0.5 py-0.5 transition-colors focus:outline-none focus-visible:text-foreground",
          active ? "text-foreground" : "hover:text-foreground"
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function CaseRow({ caseRow }: { caseRow: Case }) {
  const router = useRouter();
  return (
    <TableRow
      className="group cursor-pointer transition-colors hover:bg-muted/40"
      onClick={() => router.push(`/clinician/case/${caseRow.id}`)}
    >
      <td className="p-0">
        <Link
          href={`/clinician/case/${caseRow.id}`}
          className={cn(
            "block h-12 w-[3px]",
            SEVERITY_BG[caseRow.severity]
          )}
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
        <SeverityBadge level={caseRow.severity} />
      </TableCell>
      <TableCell className="px-4 py-3">
        <ConfidenceInline score={caseRow.confidence} />
      </TableCell>
      <TableCell className="px-4 py-3 font-mono text-[13px] tabular-nums text-muted-foreground">
        {caseRow.waitedMin}m
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <Link href={`/clinician/case/${caseRow.id}`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
          >
            Review
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}

function CaseRowSkeleton() {
  return (
    <TableRow className="border-b border-border/70 last:border-b-0">
      <td className="p-0">
        <span className="block h-12 w-[3px] bg-muted" aria-hidden="true" />
      </td>
      <TableCell className="py-3 pl-3 pr-4">
        <Skeleton className="mb-1.5 h-3.5 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </TableCell>
      <TableCell className="px-4 py-3">
        <Skeleton className="h-3 w-64" />
      </TableCell>
      <TableCell className="px-4 py-3">
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell className="px-4 py-3">
        <Skeleton className="h-3 w-44" />
      </TableCell>
      <TableCell className="px-4 py-3">
        <Skeleton className="h-3 w-10" />
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <Skeleton className="ml-auto h-7 w-20 rounded-md" />
      </TableCell>
    </TableRow>
  );
}

function CaseCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <Skeleton className="mb-1.5 h-3.5 w-32" />
          <Skeleton className="h-2.5 w-40" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-3/4" />
    </div>
  );
}

function CaseCardMobile({ caseRow }: { caseRow: Case }) {
  return (
    <Link
      href={`/clinician/case/${caseRow.id}`}
      className="relative block overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-foreground/20 active:bg-muted/40"
    >
      {/* Severity bar on left edge */}
      <span
        className={cn(
          "absolute bottom-0 left-0 top-0 w-1",
          SEVERITY_BG[caseRow.severity]
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
              <span className="font-mono">{caseRow.waitedMin}m</span> wait
            </p>
          </div>
          <SeverityBadge level={caseRow.severity} />
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-foreground/80">
          {caseRow.complaint}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <ConfidenceInline score={caseRow.confidence} />
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-primary">
            Review
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-sm font-medium">
          {filtered ? "No matching cases" : "All caught up"}
        </p>
        <p className="max-w-xs text-[13px] text-muted-foreground">
          {filtered
            ? "Try clearing the search or removing severity filters to see more results."
            : "You have no cases waiting for review. New triages will appear here as they're completed."}
        </p>
      </CardContent>
    </Card>
  );
}
