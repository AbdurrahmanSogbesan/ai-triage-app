import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/clinical/status-badge";
import { ProfileRow } from "@/components/clinical/profile-row";

import { getAdminCaseMetadata } from "../../_components/actions";

export default async function AdminCasePage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const caseRow = await getAdminCaseMetadata(reportId);
  if (!caseRow) notFound();

  const arrivedAtDisplay = (() => {
    try {
      return format(parseISO(caseRow.arrivedAt), "MMM d, yyyy · HH:mm");
    } catch {
      return caseRow.arrivedAt;
    }
  })();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
      <Link
        href="/admin"
        className="-ml-1.5 inline-flex w-fit items-center gap-1 rounded px-1.5 py-1 text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to queue
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {caseRow.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Report <span className="font-mono">{caseRow.id}</span> · Patient{" "}
          <span className="font-mono">{caseRow.patientId}</span>
        </p>
      </header>

      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-900">
        Admins see assignment metadata only. Clinical content stays with the
        clinician assigned to the case.
      </p>

      <Card>
        <CardContent className="divide-y divide-border px-6 py-2">
          <ProfileRow
            label="Patient"
            value={`${caseRow.name} · ${caseRow.age} · ${caseRow.sex === "M" ? "Male" : "Female"}`}
          />
          <ProfileRow label="Arrived" value={arrivedAtDisplay} mono />
          <ProfileRow label="Waited" value={`${caseRow.waitedMin}m`} mono />
          <ProfileRow
            label="Status"
            value={<StatusBadge status={caseRow.status} />}
          />
          <ProfileRow
            label="Assigned to"
            value={caseRow.assignedTo ?? "Unassigned"}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link
          href="/admin"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-white px-3 text-sm font-medium hover:bg-muted"
        >
          Reassign from queue
        </Link>
      </div>
    </div>
  );
}
