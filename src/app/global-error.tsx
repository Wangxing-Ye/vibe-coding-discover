"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: 48, color: "#111" }}>
        <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
        <p style={{ color: "#6B7280" }}>The page failed to load. Try again.</p>
        <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px" }}>
          Retry
        </button>
      </body>
    </html>
  );
}
