import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="px-4 py-5 sm:px-6">
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
      <main className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-6 sm:pb-12">
        {children}
      </main>
    </div>
  );
}
