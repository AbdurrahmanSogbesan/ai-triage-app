import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="px-6 py-5">
        <Link href="/login" className="inline-flex items-center gap-2.5">
          <BrandMark size={32} />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">
              Outpatient Triage
            </div>
            <div className="text-[11.5px] text-muted-foreground">
              Sunshine Medical Centre · Lagos
            </div>
          </div>
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-12">
        {children}
      </main>
    </div>
  );
}
