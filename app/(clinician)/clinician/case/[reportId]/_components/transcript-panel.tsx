import { FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TranscriptTurn } from "@/lib/types";

export function TranscriptPanel({
  transcript,
}: {
  transcript: TranscriptTurn[];
}) {
  const patientTurns = transcript.filter((t) => t.role === "patient").length;

  return (
    <Card>
      <CardContent className="px-6 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[14.5px] font-semibold">Interview transcript</h3>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {transcript.length} turns · ~{patientTurns * 45}s · English
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileText className="h-3 w-3" />
            Export PDF
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {transcript.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex max-w-[680px] flex-col gap-1",
                m.role === "patient" ? "items-end self-end" : "items-start self-start"
              )}
            >
              <span className="px-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {m.role === "patient" ? "Patient" : "AI assistant"}
              </span>
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                  m.role === "patient"
                    ? "rounded-br-md bg-muted text-foreground"
                    : "rounded-bl-md border border-border bg-white text-foreground/90"
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
