import { type Prisma } from "@prisma/client";
import { prisma } from "./db";
import { reanalyzePublishedProject } from "./pipeline";

export const REANALYZE_GAP_MS = 3_000;

/** String literals avoid stale Prisma enum exports after `prisma generate` under Turbopack. */
export const ReanalyzeStatus = {
  pending: "pending",
  running: "running",
  paused: "paused",
  stopped: "stopped",
  completed: "completed",
  failed: "failed",
} as const;

export type ReanalyzeStatusValue = (typeof ReanalyzeStatus)[keyof typeof ReanalyzeStatus];

export const ACTIVE_REANALYZE_STATUSES: ReanalyzeStatusValue[] = [
  ReanalyzeStatus.pending,
  ReanalyzeStatus.running,
  ReanalyzeStatus.paused,
];

export type ReanalyzeEvent = {
  at: string;
  projectId: string;
  label: string;
  ok: boolean;
  error?: string;
};

function asEvents(value: Prisma.JsonValue | null | undefined): ReanalyzeEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ReanalyzeEvent => {
    return Boolean(item && typeof item === "object" && "projectId" in item && "label" in item);
  });
}

export async function findActiveReanalyzeJob() {
  return prisma.reanalyzeJob.findFirst({
    where: { status: { in: [...ACTIVE_REANALYZE_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createReanalyzeAllJob() {
  const active = await findActiveReanalyzeJob();
  if (active) return { job: active, created: false as const };

  const projects = await prisma.project.findMany({
    where: { status: "published" },
    select: { id: true },
    orderBy: [{ stars: "desc" }, { createdAt: "desc" }],
  });

  const job = await prisma.reanalyzeJob.create({
    data: {
      status: projects.length ? ReanalyzeStatus.running : ReanalyzeStatus.completed,
      total: projects.length,
      done: 0,
      failedCount: 0,
      cursor: 0,
      projectIds: projects.map((project) => project.id),
      events: [],
    },
  });

  return { job, created: true as const };
}

export async function getReanalyzeJob(id: string) {
  return prisma.reanalyzeJob.findUnique({ where: { id } });
}

export async function setReanalyzeJobStatus(id: string, status: ReanalyzeStatusValue) {
  const job = await prisma.reanalyzeJob.findUnique({ where: { id } });
  if (!job) return null;

  if (status === ReanalyzeStatus.running) {
    if (job.status !== ReanalyzeStatus.paused && job.status !== ReanalyzeStatus.pending) {
      return job;
    }
  } else if (status === ReanalyzeStatus.paused) {
    if (job.status !== ReanalyzeStatus.running && job.status !== ReanalyzeStatus.pending) {
      return job;
    }
  } else if (status === ReanalyzeStatus.stopped) {
    if (
      job.status === ReanalyzeStatus.completed ||
      job.status === ReanalyzeStatus.stopped ||
      job.status === ReanalyzeStatus.failed
    ) {
      return job;
    }
  } else {
    return job;
  }

  return prisma.reanalyzeJob.update({
    where: { id },
    data: { status },
  });
}

/**
 * Process one published project for a running job.
 * Safe to call from the worker and from the progress-page tick API.
 */
export async function processReanalyzeJobOnce(jobId?: string): Promise<{
  processed: boolean;
  jobId?: string;
  label?: string;
}> {
  const job = jobId
    ? await prisma.reanalyzeJob.findUnique({ where: { id: jobId } })
    : await prisma.reanalyzeJob.findFirst({
        where: { status: ReanalyzeStatus.running },
        orderBy: { createdAt: "asc" },
      });

  if (!job || job.status !== ReanalyzeStatus.running) {
    return { processed: false, jobId: job?.id };
  }

  if (job.cursor >= job.projectIds.length) {
    await prisma.reanalyzeJob.update({
      where: { id: job.id },
      data: {
        status: ReanalyzeStatus.completed,
        currentProjectId: null,
        currentLabel: null,
      },
    });
    return { processed: false, jobId: job.id };
  }

  const projectId = job.projectIds[job.cursor];
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, owner: true, repoName: true, status: true },
  });
  const label = project ? `${project.owner}/${project.repoName}` : projectId;

  // Require a free lock so the progress page and worker never analyze two projects at once.
  const claimed = await prisma.reanalyzeJob.updateMany({
    where: {
      id: job.id,
      status: ReanalyzeStatus.running,
      cursor: job.cursor,
      currentProjectId: null,
    },
    data: {
      currentProjectId: projectId,
      currentLabel: label,
    },
  });
  if (claimed.count === 0) {
    return { processed: false, jobId: job.id };
  }

  let ok = false;
  let error: string | undefined;

  try {
    if (!project || project.status !== "published") {
      ok = false;
      error = project ? `skipped: status is ${project.status}` : "project not found";
    } else {
      const result = await reanalyzePublishedProject(project.id);
      ok = result.ok;
      error = result.error;
    }
  } catch (err) {
    ok = false;
    error = err instanceof Error ? err.message : "Re-analyze failed";
  }

  const latest = await prisma.reanalyzeJob.findUnique({ where: { id: job.id } });
  if (!latest) return { processed: true, jobId: job.id, label };

  const events = asEvents(latest.events);
  events.unshift({
    at: new Date().toISOString(),
    projectId,
    label,
    ok,
    error,
  });

  const preserveControl =
    latest.status === ReanalyzeStatus.paused || latest.status === ReanalyzeStatus.stopped;

  // Hold the lock through the mandatory gap so only one analyzer runs at a time.
  if (!preserveControl && latest.cursor + 1 < latest.projectIds.length) {
    await new Promise((resolve) => setTimeout(resolve, REANALYZE_GAP_MS));
  }

  const afterGap = await prisma.reanalyzeJob.findUnique({ where: { id: job.id } });
  if (!afterGap) return { processed: true, jobId: job.id, label };

  const stillPreserve =
    afterGap.status === ReanalyzeStatus.paused || afterGap.status === ReanalyzeStatus.stopped;
  const nextCursor = afterGap.cursor + 1;
  const done = afterGap.done + 1;
  const failedCount = afterGap.failedCount + (ok ? 0 : 1);
  const finished = nextCursor >= afterGap.projectIds.length;

  await prisma.reanalyzeJob.update({
    where: { id: job.id },
    data: {
      cursor: nextCursor,
      done,
      failedCount,
      lastError: error || null,
      events: events.slice(0, 30) as Prisma.InputJsonValue,
      currentProjectId: null,
      currentLabel: finished ? null : stillPreserve ? label : null,
      status: finished
        ? ReanalyzeStatus.completed
        : stillPreserve
          ? afterGap.status
          : ReanalyzeStatus.running,
    },
  });

  return { processed: true, jobId: job.id, label };
}

export async function processRunningReanalyzeJobs() {
  return processReanalyzeJobOnce();
}

export function serializeReanalyzeJob(job: NonNullable<Awaited<ReturnType<typeof getReanalyzeJob>>>) {
  return {
    id: job.id,
    status: job.status,
    total: job.total,
    done: job.done,
    failedCount: job.failedCount,
    cursor: job.cursor,
    currentProjectId: job.currentProjectId,
    currentLabel: job.currentLabel,
    lastError: job.lastError,
    events: asEvents(job.events),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
