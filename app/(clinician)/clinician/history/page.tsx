import { Card, CardContent } from "@/components/ui/card";

export default function ClinicianHistoryPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-semibold tracking-tight">
          History
        </h1>
        <p className="text-sm text-muted-foreground">
          Cases you&apos;ve completed. Read-only.
        </p>
      </header>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="text-sm font-medium">No completed cases yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Once you confirm or override a case on the dashboard, it will move
            here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
