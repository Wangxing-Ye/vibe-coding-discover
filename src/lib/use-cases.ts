import { ProjectStatus } from "@prisma/client";
import { prisma } from "./db";

export type UseCaseWithCount = {
  id: string;
  name: string;
  slug: string;
  projectCount: number;
};

/** Normalize AI use-case labels into stable name + slug. */
export function normalizeUseCaseLabel(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[-•*]+\s*/, "")
    .replace(/[.!?]+$/, "");
  if (!cleaned) return null;

  const name = cleaned
    .split(" ")
    .map((word) => {
      if (word.length <= 2 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .slice(0, 80);

  const slug = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (!slug) return null;
  return { name, slug };
}

/** Recount stored projectCount from live published links (not raw increment). */
async function recountUseCases(useCaseIds: string[]) {
  const ids = [...new Set(useCaseIds.filter(Boolean))];
  if (!ids.length) return;

  const grouped = await prisma.projectUseCase.groupBy({
    by: ["useCaseId"],
    where: {
      useCaseId: { in: ids },
      project: { status: ProjectStatus.published },
    },
    _count: { projectId: true },
  });
  const counts = new Map(grouped.map((row) => [row.useCaseId, row._count.projectId]));

  await Promise.all(
    ids.map((id) =>
      prisma.useCase.update({
        where: { id },
        data: { projectCount: counts.get(id) ?? 0 },
      }),
    ),
  );
}

export async function clearProjectUseCases(projectId: string) {
  const previous = await prisma.projectUseCase.findMany({
    where: { projectId },
    select: { useCaseId: true },
  });
  await prisma.projectUseCase.deleteMany({ where: { projectId } });
  await recountUseCases(previous.map((row) => row.useCaseId));
}

/**
 * Rebuild junction rows from analysis.useCases.
 * Only keeps links while the project is published.
 */
export async function syncProjectUseCases(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { analysis: true },
  });
  if (!project) return;

  if (project.status !== ProjectStatus.published || !project.analysis) {
    await clearProjectUseCases(projectId);
    return;
  }

  const labels = project.analysis.useCases
    .map(normalizeUseCaseLabel)
    .filter((item): item is { name: string; slug: string } => Boolean(item));

  const unique = new Map<string, { name: string; slug: string }>();
  for (const label of labels) {
    if (!unique.has(label.slug)) unique.set(label.slug, label);
  }

  const previous = await prisma.projectUseCase.findMany({
    where: { projectId },
    select: { useCaseId: true },
  });
  await prisma.projectUseCase.deleteMany({ where: { projectId } });

  const nextIds: string[] = [];
  for (const label of unique.values()) {
    const useCase = await prisma.useCase.upsert({
      where: { slug: label.slug },
      create: { name: label.name, slug: label.slug },
      update: { name: label.name },
    });
    await prisma.projectUseCase.create({
      data: { projectId, useCaseId: useCase.id },
    });
    nextIds.push(useCase.id);
  }

  await recountUseCases([...previous.map((row) => row.useCaseId), ...nextIds]);
}

function toUseCaseWithCount(useCase: {
  id: string;
  name: string;
  slug: string;
  projectCount: number;
}): UseCaseWithCount {
  return {
    id: useCase.id,
    name: useCase.name,
    slug: useCase.slug,
    projectCount: useCase.projectCount,
  };
}

export async function getTopUseCases(take = 8): Promise<UseCaseWithCount[]> {
  const useCases = await prisma.useCase.findMany({
    where: { projectCount: { gt: 0 } },
    orderBy: [{ projectCount: "desc" }, { name: "asc" }],
    take,
  });
  return useCases.map(toUseCaseWithCount);
}

/** Count use cases linked to at least one published project. */
export async function countUseCases() {
  return prisma.useCase.count({
    where: { projectCount: { gt: 0 } },
  });
}

/** Use cases created since `since` that are linked to at least one published project. */
export async function countUseCasesAddedToday(since: Date) {
  return prisma.useCase.count({
    where: {
      createdAt: { gte: since },
      projectCount: { gt: 0 },
    },
  });
}

export async function getAllUseCases(query?: string): Promise<UseCaseWithCount[]> {
  const result = await getUseCasesPage({ query });
  return result.items;
}

export { startOfTodayLocal, startOfTodayUtc } from "./catalog-day";

export async function getUseCasesPage(options: {
  query?: string;
  take?: number;
  skip?: number;
  createdSince?: Date;
}): Promise<{ items: UseCaseWithCount[]; total: number }> {
  const q = options.query?.trim();
  const where = {
    projectCount: { gt: 0 },
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(options.createdSince ? { createdAt: { gte: options.createdSince } } : {}),
  };

  const total = await prisma.useCase.count({ where });
  if (options.take === 0) return { items: [], total };

  const useCases = await prisma.useCase.findMany({
    where,
    orderBy: [{ projectCount: "desc" }, { name: "asc" }],
    skip: options.skip ?? 0,
    ...(options.take != null ? { take: options.take } : {}),
  });

  return { items: useCases.map(toUseCaseWithCount), total };
}

export async function getUseCaseBySlug(slug: string) {
  return prisma.useCase.findUnique({ where: { slug } });
}

export async function getProjectsForUseCase(slug: string) {
  return prisma.project.findMany({
    where: {
      status: ProjectStatus.published,
      useCaseLinks: { some: { useCase: { slug } } },
    },
    include: { analysis: true },
    orderBy: [{ stars: "desc" }, { createdAt: "desc" }],
  });
}

/** Recompute every use case projectCount from published links. */
export async function refreshAllUseCaseCounts() {
  await prisma.$executeRaw`
    UPDATE "use_cases" AS uc
    SET "projectCount" = COALESCE((
      SELECT COUNT(*)::integer
      FROM "project_use_cases" AS puc
      INNER JOIN "projects" AS p ON p.id = puc."projectId"
      WHERE puc."useCaseId" = uc.id
        AND p.status = 'published'
    ), 0)
  `;
}

/** One-shot backfill for already-published projects. */
export async function backfillPublishedUseCases() {
  const projects = await prisma.project.findMany({
    where: { status: ProjectStatus.published, analysis: { isNot: null } },
    select: { id: true },
  });
  for (const project of projects) {
    await syncProjectUseCases(project.id);
  }
  await refreshAllUseCaseCounts();
  return projects.length;
}
