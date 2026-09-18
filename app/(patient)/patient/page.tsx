import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInYears, format, parseISO } from "date-fns";
import {
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  History,
  Info,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmergencyBanner } from "@/components/clinical/emergency-banner";
import { StatusBadge } from "@/components/clinical/status-badge";
import { shortPatientId } from "@/lib/utils";

import {
  getHasVitalsToday,
  getInProgressSession,
  getMyPatientProfile,
  getPatientSessionStats,
  getRecentSessions,
  type PatientProfile,
} from "./_components/actions";
import { StartTriageFlow } from "./_components/start-triage-flow";
import { InProgressCard } from "./_components/in-progress-card";

const CLINIC_NAME = "Sunshine Medical";

function formatSessionDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

function describeAgeSex(profile: PatientProfile): string {
  const sex = profile.sex
    ? profile.sex.toLowerCase() === "f"
      ? "Female"
      : profile.sex.toLowerCase() === "m"
        ? "Male"
        : profile.sex
    : "—";
  if (!profile.date_of_birth) return sex;
  const age = differenceInYears(new Date(), parseISO(profile.date_of_birth));
  return `${age} · ${sex}`;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function PatientDashboardPage() {
  const greeting = greetingForHour(new Date().getHours());
  const [profile, hasVitalsToday, inProgress, recentSessions, stats] =
    await Promise.all([
      getMyPatientProfile(),
      getHasVitalsToday(),
      getInProgressSession(),
      getRecentSessions(10),
      getPatientSessionStats(),
    ]);

  // The (patient) layout already guards the route; if we get here without a
  // profile row the user is half-onboarded and should finish profile setup.
  if (!profile) redirect("/patient/profile");

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-6 md:px-8 md:py-7">
      {/* Mobile greeting (firstName in the heading) */}
      <header className="mb-5 md:hidden">
        <p className="text-[12.5px] font-medium text-muted-foreground">
          {greeting}
        </p>
        <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-tight">
          {profile.first_name}, how are you feeling today?
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
          When you&apos;re ready, we&apos;ll ask you a few questions to help the
          doctor understand your symptoms before your appointment.
        </p>
      </header>

      {/* Desktop greeting (greeting + firstName as caption) */}
      <header className="mb-6 hidden md:block">
        <p className="text-[12.5px] font-medium text-muted-foreground">
          {greeting}, {profile.first_name}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <h1 className="max-w-[640px] text-[24px] font-semibold leading-tight tracking-tight">
            How are you feeling today?
          </h1>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Today,{" "}
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile CTA: big tall block button + vitals helper */}
      <section className="mb-5 md:hidden">
        <StartTriageFlow variant="block" hasVitalsToday={hasVitalsToday} />
        <p className="mt-2.5 flex items-start gap-1.5 px-1 text-[12px] text-muted-foreground">
          <Info className="mt-[1px] h-3 w-3 shrink-0 text-muted-foreground/70" />
          {hasVitalsToday
            ? "Your vitals from today are already on file. We'll go straight to your symptoms."
            : "We'll start by recording your vitals — blood pressure, temperature, and weight."}
        </p>
      </section>

      {/* Main grid — right rail joins from xl (was lg); below xl it sits in
          the main column so the grid never goes 1fr 360 on tight desktops. */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="hidden md:block">
            <HeroStartTriage hasVitalsToday={hasVitalsToday} />
          </div>

          {inProgress && (
            <section>
              <div className="mb-2.5 flex items-center justify-between px-0.5">
                <h2 className="text-[13px] font-semibold">Current session</h2>
                <StatusBadge status="in_progress" />
              </div>
              {/* Mobile variant */}
              <div className="md:hidden">
                <InProgressCard
                  session={{
                    id: inProgress.id,
                    complaint: inProgress.chief_complaint,
                    sessionStartedAt: inProgress.session_started_at,
                  }}
                  variant="phone"
                />
              </div>
              {/* Desktop variant */}
              <div className="hidden md:block">
                <InProgressCard
                  session={{
                    id: inProgress.id,
                    complaint: inProgress.chief_complaint,
                    sessionStartedAt: inProgress.session_started_at,
                  }}
                  variant="desktop"
                />
              </div>
            </section>
          )}

          {/* Quick-action tiles — desktop only */}
          <section className="hidden md:block">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <QuickActionTile
                icon={History}
                label="Most recent triage"
                value={
                  stats.mostRecent
                    ? formatSessionDate(stats.mostRecent.created_at)
                    : "—"
                }
                sub={stats.mostRecent?.chief_complaint ?? "No sessions yet"}
                href="/patient/sessions"
              />
              <QuickActionTile
                icon={FileText}
                label="Latest report"
                value={
                  stats.latestReport
                    ? formatSessionDate(stats.latestReport.created_at)
                    : "—"
                }
                sub={stats.latestReport?.chief_complaint ?? "No reports yet"}
                href="/patient/sessions"
              />
              <QuickActionTile
                icon={ShieldCheck}
                label="Records on file"
                value={`${stats.total} ${stats.total === 1 ? "session" : "sessions"}`}
                sub="Available to your clinician"
                href="/patient/sessions"
              />
            </div>
          </section>

          <section>
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-[13px] font-semibold">Recent sessions</h2>
              <Link
                href="/patient/sessions"
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
              >
                View all
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <Card>
                <CardContent className="px-5 py-8 text-center">
                  <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </span>
                  <p className="text-[13.5px] font-medium">No sessions yet</p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    Once you complete a triage, it will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Mobile: list */}
                <Card className="py-0 md:hidden">
                  <CardContent className="divide-y divide-border px-0 py-0">
                    {recentSessions.slice(0, 3).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 px-4 py-3.5"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">
                            {s.chief_complaint}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                            <span>{formatSessionDate(s.created_at)}</span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                            <StatusBadge status={s.status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Desktop: table */}
                <Card className="hidden py-0 md:block">
                  <CardContent className="px-0 py-0">
                    <Table className="w-full table-fixed">
                      <TableHeader>
                        <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                          <TableHead className="h-9 pl-5 pr-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                            Complaint
                          </TableHead>
                          <TableHead className="h-9 w-[180px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                            Date
                          </TableHead>
                          <TableHead className="h-9 w-[150px] px-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentSessions.map((s) => (
                          <TableRow key={s.id} className="hover:bg-muted/30">
                            <TableCell className="max-w-0 py-3.5 pl-5 pr-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                  <FileText className="h-3 w-3" />
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
              </>
            )}
          </section>

          <div className="md:hidden">
            <EmergencyBanner />
          </div>
        </div>

        {/* Right rail — desktop only */}
        <aside className="hidden flex-col gap-4 lg:sticky lg:top-7 lg:flex">
          <PatientSummaryCard profile={profile} />
          <EmergencyCard />
        </aside>
      </div>
    </div>
  );
}

function HeroStartTriage({ hasVitalsToday }: { hasVitalsToday: boolean }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 items-center gap-6 px-6 py-6 md:grid-cols-[1fr_auto]">
        <div>
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            AI-assisted triage
          </span>
          <h2 className="text-[22px] font-semibold leading-tight tracking-tight">
            Ready to begin your visit?
          </h2>
          <p className="mt-2 max-w-[480px] text-[14px] leading-relaxed text-muted-foreground">
            We&apos;ll ask a few questions about how you&apos;re feeling. Your
            answers go straight to the doctor before your appointment — about 5
            minutes total.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StartTriageFlow hasVitalsToday={hasVitalsToday} />
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
              About 5 minutes
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-[12px] text-muted-foreground">
              <Info className="h-3 w-3 text-muted-foreground/70" />
              {hasVitalsToday ? "Vitals on file" : "Vitals required first"}
            </span>
          </div>
        </div>
        <div className="relative hidden h-[180px] w-[180px] items-center justify-center overflow-hidden rounded-xl bg-primary/5 md:flex">
          <span
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,.6), transparent 60%)",
            }}
            aria-hidden="true"
          />
          <svg
            width="84"
            height="84"
            viewBox="0 0 84 84"
            fill="none"
            className="relative"
            aria-hidden="true"
          >
            <circle
              cx="42"
              cy="42"
              r="34"
              stroke="var(--color-primary)"
              strokeOpacity=".18"
              strokeWidth="1.5"
            />
            <circle
              cx="42"
              cy="42"
              r="22"
              stroke="var(--color-primary)"
              strokeOpacity=".28"
              strokeWidth="1.5"
            />
            <path
              d="M16 46h10l4-14 8 22 6-16 4 8h20"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionTile({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-border bg-white p-4 transition-all hover:border-foreground/20 hover:shadow-sm"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-[15px] font-semibold leading-tight tracking-tight">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {sub}
        </p>
      </div>
      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
    </Link>
  );
}

function PatientSummaryCard({ profile }: { profile: PatientProfile }) {
  const fullName = `${profile.first_name} ${profile.last_name}`;
  const initials = `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`;
  return (
    <Card>
      <CardContent className="px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-[15px] font-medium">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-medium">{fullName}</p>
            <p className="text-[11.5px] text-muted-foreground">
              Patient · ID{" "}
              <span className="font-mono">{shortPatientId(profile.id)}</span>
            </p>
          </div>
        </div>
        <dl className="mt-4 flex flex-col gap-2.5 text-[12.5px]">
          <SummaryRow label="Age / sex" value={describeAgeSex(profile)} />
          <SummaryRow label="Blood group" value={profile.blood_group ?? "—"} />
          <SummaryRow label="Genotype" value={profile.genotype ?? "—"} />
          <SummaryRow label="Hospital" value={CLINIC_NAME} />
        </dl>
        <Link
          href="/patient/profile"
          className="mt-4 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-[12.5px] font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
        >
          Edit profile
          <ChevronRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function EmergencyCard() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Info className="h-[17px] w-[17px]" />
        </span>
        <div>
          <p className="text-[13.5px] font-semibold text-amber-900">
            Emergency?
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-amber-900/90">
            Don&apos;t wait for the AI interview — tell the front desk
            immediately or call{" "}
            <span className="font-mono font-semibold">112</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
