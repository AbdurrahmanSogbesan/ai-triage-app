import { format, parseISO } from "date-fns";
import { FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/clinical/status-badge";

import { getRecentSessions } from "../_components/actions";

function formatSessionDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export default async function PatientSessionsPage() {
  const sessions = await getRecentSessions(200);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-5 py-6 md:px-8 md:py-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-semibold tracking-tight">Sessions</h1>
        <p className="text-[13.5px] text-muted-foreground">
          A full history of your triage sessions and what the doctor saw.
        </p>
      </header>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="px-5 py-12 text-center">
            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileText className="h-4 w-4" />
            </span>
            <p className="text-[13.5px] font-medium">No sessions yet</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Start a triage from your dashboard to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop: shadcn Table styled to match the design */}
          <Card className="hidden py-0 md:block">
            <CardContent className="px-0 py-0">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-9 pl-5 pr-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                      Complaint
                    </TableHead>
                    <TableHead className="h-9 w-[200px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                      Date
                    </TableHead>
                    <TableHead className="h-9 w-[160px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="max-w-0 py-3.5 pl-5 pr-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13.5px]">
                            {s.chief_complaint}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">
                        {formatSessionDate(s.created_at)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <StatusBadge status={s.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile: list with file-icon avatars */}
          <Card className="py-0 md:hidden">
            <CardContent className="divide-y divide-border px-0 py-0">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-start gap-3 px-4 py-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium">
                      {s.chief_complaint}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[11.5px] text-muted-foreground">
                        {formatSessionDate(s.created_at)}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
