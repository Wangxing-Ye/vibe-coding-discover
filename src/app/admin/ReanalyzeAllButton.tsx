"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CONFIRM_MESSAGE =
  "Re-analyze ALL published projects?\n\n" +
  "• Each published project will be re-run through AI analysis\n" +
  "• Status stays published\n" +
  "• Use cases will be cleared and rewritten from the new analysis\n" +
  "• After each project, wait 3 seconds before the next\n\n" +
  "A progress page will open so you can pause, resume, or stop.";

export function ReanalyzeAllButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    if (!window.confirm(CONFIRM_MESSAGE)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/reanalyze", { method: "POST" });
      const text = await res.text();
      let data: { job?: { id: string }; error?: string } = {};
      try {
        data = text ? (JSON.parse(text) as { job?: { id: string }; error?: string }) : {};
      } catch {
        window.alert(res.ok ? "Unexpected response from server" : `Failed to start re-analyze job (${res.status})`);
        return;
      }
      if (!res.ok || !data.job?.id) {
        window.alert(data.error || `Failed to start re-analyze job (${res.status})`);
        return;
      }
      const href = `/admin/reanalyze/${data.job.id}`;
      const opened = window.open(href, "_blank", "noopener,noreferrer");
      if (!opened) {
        router.push(href);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to start re-analyze job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="h-11 cursor-pointer rounded-full border border-border px-5 text-sm font-medium text-foreground hover:border-foreground disabled:cursor-wait disabled:opacity-60"
    >
      {busy ? "Starting…" : "Re-analyze All"}
    </button>
  );
}
