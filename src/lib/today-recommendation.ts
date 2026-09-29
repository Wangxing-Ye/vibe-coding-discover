import { ProjectStatus } from "@prisma/client";
import { isSameUtcDay, startOfTodayUtc } from "./catalog-day";
import { prisma } from "./db";

export type RecommendationSource = "github" | "x" | "trending" | "submit" | "admin" | "watchlist";

/** UTC calendar date at midnight (matches homepage “Today” and VIBECD claim days). */
export function todayLocalDate() {
  return startOfTodayUtc();
}

export function isSameLocalDay(value: Date, day = todayLocalDate()) {
  return isSameUtcDay(value, day);
}

/**
 * Today’s Recommendations:
 * - trending discoveries, or
 * - projects newly published today (created today, or caller marks newlyPublished).
 * Re-discovering an already-published older repo does not qualify.
 */
export function shouldRecommendToday(options: {
  source: RecommendationSource;
  status: ProjectStatus | string;
  projectCreatedAt?: Date | null;
  newlyPublished?: boolean;
}) {
  if (options.status !== ProjectStatus.published && options.status !== "published") {
    return false;
  }
  if (options.source === "trending") return true;
  if (options.newlyPublished) return true;
  if (options.projectCreatedAt && isSameLocalDay(options.projectCreatedAt)) return true;
  return false;
}

export async function upsertTodayRecommendation(options: {
  projectId: string;
  projectName: string;
  stars: number;
  source: RecommendationSource;
  status: ProjectStatus | string;
  /** Stars gained today from GitHub Trending; 0 for submit/admin/search/x. */
  todayStars?: number;
  /** Project createdAt when known (avoids an extra lookup). */
  projectCreatedAt?: Date | null;
  /** True when this call is the first publish (e.g. admin publish of an older draft). */
  newlyPublished?: boolean;
}) {
  const todayStars = options.todayStars ?? 0;
  const date = todayLocalDate();

  const existing = await prisma.todayRecommendation.findUnique({
    where: {
      date_projectId: {
        date,
        projectId: options.projectId,
      },
    },
  });

  // Trending scrape: if a row already exists for today, always refresh todayStars.
  if (existing && options.source === "trending") {
    await prisma.todayRecommendation.update({
      where: { id: existing.id },
      data: {
        projectName: options.projectName,
        stars: options.stars,
        todayStars,
        source: "trending",
      },
    });
    return true;
  }

  let projectCreatedAt = options.projectCreatedAt ?? null;
  if (options.source !== "trending" && !options.newlyPublished && !projectCreatedAt) {
    const project = await prisma.project.findUnique({
      where: { id: options.projectId },
      select: { createdAt: true },
    });
    projectCreatedAt = project?.createdAt ?? null;
  }

  if (
    !shouldRecommendToday({
      source: options.source,
      status: options.status,
      projectCreatedAt,
      newlyPublished: options.newlyPublished,
    })
  ) {
    return false;
  }

  if (existing) {
    await prisma.todayRecommendation.update({
      where: { id: existing.id },
      data: {
        projectName: options.projectName,
        stars: options.stars,
        source: options.source,
        // Do not wipe todayStars from submit/admin/search/x.
      },
    });
    return true;
  }

  await prisma.todayRecommendation.create({
    data: {
      date,
      projectId: options.projectId,
      projectName: options.projectName,
      stars: options.stars,
      todayStars: options.source === "trending" ? todayStars : 0,
      source: options.source,
    },
  });
  return true;
}

/** Remove today’s rows that are neither trending nor for projects created today. */
export async function cleanupStaleTodayRecommendations() {
  const date = todayLocalDate();
  const rows = await prisma.todayRecommendation.findMany({
    where: { date },
    select: {
      id: true,
      source: true,
      project: { select: { createdAt: true } },
    },
  });

  const staleIds = rows
    .filter((row) => row.source !== "trending" && !isSameLocalDay(row.project.createdAt, date))
    .map((row) => row.id);

  if (staleIds.length) {
    await prisma.todayRecommendation.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  return { removed: staleIds.length, remaining: rows.length - staleIds.length };
}

function isNewlyPublishedToday(row: {
  source: string;
  project: { createdAt: Date };
}) {
  if (isSameLocalDay(row.project.createdAt)) return true;
  return row.source === "admin" || row.source === "submit";
}

/**
 * Homepage picks:
 * 1–2: highest todayStars (then stars)
 * 3: highest stars among projects newly published today (not already picked)
 */
export async function getTodayRecommendations(take = 3) {
  const date = todayLocalDate();
  const rows = await prisma.todayRecommendation.findMany({
    where: { date },
    orderBy: [{ todayStars: "desc" }, { stars: "desc" }, { createdAt: "desc" }],
    include: {
      project: {
        include: { analysis: true },
      },
    },
  });

  const eligible = rows.filter(
    (row) => row.project.status === ProjectStatus.published && row.project.analysis,
  );

  const picked: typeof eligible = [];
  const pickedIds = new Set<string>();

  for (const row of eligible) {
    if (picked.length >= 2) break;
    picked.push(row);
    pickedIds.add(row.projectId);
  }

  if (take > 2) {
    const newToday = eligible
      .filter((row) => isNewlyPublishedToday(row) && !pickedIds.has(row.projectId))
      .sort((a, b) => b.stars - a.stars || b.createdAt.getTime() - a.createdAt.getTime());
    if (newToday[0]) {
      picked.push(newToday[0]);
    }
  }

  return picked.slice(0, take).map((row) => row.project);
}
