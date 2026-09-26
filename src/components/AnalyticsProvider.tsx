"use client";

import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { posthogHost, posthogKey } from "@/lib/analytics-public";

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const key = posthogKey();
    if (!key || typeof window === "undefined") return;
    if (!posthog.__loaded) {
      posthog.init(key, {
        api_host: posthogHost(),
        capture_pageview: false,
        persistence: "localStorage+cookie",
      });
    }
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      path: pathname,
      query: searchParams.toString(),
    });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </>
  );
}

export function trackClient(event: string, properties?: Record<string, unknown>) {
  if (!posthogKey()) return;
  posthog.capture(event, properties);
}
