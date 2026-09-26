"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type ReanalyzeJobView = {
  id: string;
  status: string;
  total: number;
  done: number;
  failedCount: number;
  cursor: number;
  currentProjectId: string | null;
  currentLabel: string | null;
  lastError: string | null;
  events: Array<{
    at: string;
    projectId: string;
    label: string;
    ok: boolean;
    error?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export function ReanalyzeProgress({ initialJob }: { initialJob: ReanalyzeJobView }) {
  const [job, setJob] = useState(initialJob);
  const [error, setError] = useState<string | null>(null);
  const [controlBusy, setControlBusy] = useState(false);
  const runningRef = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/reanalyze/${initialJob.id}`);
    const data = (await res.json()) as { job?: ReanalyzeJobView; error?: string };
    if (!res.ok || !data.job) {
      setError(data.error || "Failed to load job");
      return null;
    }
    setJob(data.job);
    setError(null);
    return data.job;
  }, [initialJob.id]);

  const control = useCallback(
    async (action: "pause" | "resume" | "stop" | "tick") => {
      const res = await fetch(`/api/admin/reanalyze/${initialJob.id}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { job?: ReanalyzeJobView; error?: string };
      if (!res.ok || !data.job) {
        setError(data.error || "Control failed");
        return null;
      }
      setJob(data.job);
      setError(null);
      return data.job;
    },
    [initialJob.id],
  );

  useEffect(() => {
    let cancelled = false;

    async function loop() {
      while (!cancelled) {
        const latest = await refresh();
        if (cancelled) break;

        if (latest?.status === "running" && !runningRef.current) {
          runningRef.current = true;
          try {
            await control("tick");
          } finally {
            runningRef.current = false;
          }
          continue;
        }

        await new Promise((resolve) => setTimeout(resolve, latest?.status === "running" ? 400 : 1500));
      }
    }

    void loop();
    return () => {
      cancelled = true;
    };
  }, [control, refresh]);

  async function onControl(action: "pause" | "resume" | "stop") {
    if (controlBusy) return;
    if (action === "stop" && !window.confirm("Stop this job? Remaining projects will not be re-analyzed.")) {
      return;
    }
    setControlBusy(true);
    try {
      await control(action);
    } finally {
      setControlBusy(false);
    }
  }

  const percent = job.total > 0 ? Math.min(100, Math.round((job.done / job.total) * 100)) : 100;
  const terminal = job.status === "completed" || job.status === "stopped" || job.status === "failed";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-secondary">
            <Link href="/admin/projects" className="hover:underline">
              All projects
            </Link>
            <span className="mx-2">/</span>
            Re-analyze
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">Re-analyze All</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.status === "running" || job.status === "pending" ? (
            <button
              type="button"
              disabled={controlBusy}
              onClick={() => onControl("pause")}
              className="h-10 rounded-full border border-border px-4 text-sm hover:border-foreground disabled:opacity-60"
            >
              Pause
            </button>
          ) : null}
          {job.status === "paused" ? (
            <button
              type="button"
              disabled={controlBusy}
              onClick={() => onControl("resume")}
              className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
            >
              Resume
            </button>
          ) : null}
          {!terminal ? (
            <button
              type="button"
              disabled={controlBusy}
              onClick={() => onControl("stop")}
              className="h-10 rounded-full border border-red-200 px-4 text-sm text-red-700 hover:border-red-400 disabled:opacity-60"
            >
              Stop
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-secondary">Status</p>
            <p className="mt-1 text-base font-medium capitalize">{job.status}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary">Progress</p>
            <p className="mt-1 text-base font-medium">
              {job.done} / {job.total}
              <span className="ml-2 text-secondary">({percent}%)</span>
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${percent}%` }} />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-secondary">Current project</dt>
            <dd className="mt-1 text-sm font-medium">{job.currentLabel || (terminal ? "—" : "Waiting…")}</dd>
          </div>
          <div>
            <dt className="text-sm text-secondary">Failed</dt>
            <dd className="mt-1 text-sm font-medium">{job.failedCount}</dd>
          </div>
          <div>
            <dt className="text-sm text-secondary">Last error</dt>
            <dd className="mt-1 text-sm text-secondary">{job.lastError || "—"}</dd>
          </div>
        </dl>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8">
        <h3 className="text-sm font-medium text-secondary">Recent results</h3>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {job.events.length === 0 ? (
            <li className="px-4 py-6 text-sm text-secondary">No projects processed yet.</li>
          ) : (
            job.events.map((event) => (
              <li key={`${event.projectId}-${event.at}`} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{event.label}</p>
                  {event.error ? <p className="mt-1 text-secondary">{event.error}</p> : null}
                </div>
                <span className={event.ok ? "text-emerald-700" : "text-amber-700"}>{event.ok ? "OK" : "Failed"}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
