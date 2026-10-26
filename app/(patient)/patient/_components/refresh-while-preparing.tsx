"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 5000;

/**
 * Re-fetches the dashboard while the AI pipeline is still running so the
 * patient's next steps appear without a manual reload. Unmounts as soon as
 * the server stops rendering the preparing state; `until` is a backstop.
 */
export function RefreshWhilePreparing({ until }: { until: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() >= until) window.clearInterval(id);
      router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router, until]);

  return null;
}
