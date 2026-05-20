import { notFound } from "next/navigation";

import {
  getCaseById,
  SOAP_R2041,
  TRANSCRIPT_R2041,
} from "@/lib/data/mock-cases";

import { CaseDetailView } from "./_components/case-detail-view";

export default async function ClinicianCasePage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const caseRow = getCaseById(reportId);
  if (!caseRow) notFound();

  return (
    <CaseDetailView
      caseRow={caseRow}
      soap={SOAP_R2041}
      transcript={TRANSCRIPT_R2041}
    />
  );
}
