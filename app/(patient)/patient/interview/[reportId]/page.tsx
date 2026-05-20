import { notFound } from "next/navigation";

import { getCaseById, TRANSCRIPT_R2041 } from "@/lib/data/mock-cases";

import { InterviewView } from "./_components/interview-view";

type InterviewState = "start" | "mid" | "end" | "error";

function parseState(raw: string | string[] | undefined): InterviewState {
  if (raw === "mid" || raw === "end" || raw === "error") return raw;
  return "start";
}

export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  const { reportId } = await params;
  const sp = await searchParams;
  const state = parseState(sp.state);

  const caseRow = getCaseById(reportId);
  if (!caseRow) notFound();

  const turns =
    state === "start"
      ? [TRANSCRIPT_R2041[0]]
      : state === "mid"
        ? TRANSCRIPT_R2041.slice(0, 6)
        : TRANSCRIPT_R2041;

  return (
    <InterviewView
      reportId={reportId}
      patientFirstName={caseRow.name.split(" ")[0]}
      vitals={caseRow.vitals}
      complaint={caseRow.complaint}
      transcript={turns}
      state={state}
    />
  );
}
