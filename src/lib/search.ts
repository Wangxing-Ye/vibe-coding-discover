import { Category, ProjectStatus, type Prisma } from "@prisma/client";
import { prisma } from "./db";

function projectSearchWhere(
  options: { query?: string; category?: Category; createdSince?: Date } = {},
): Prisma.ProjectWhereInput {
  const query = options.query?.trim();
  return {
    status: ProjectStatus.published,
    analysis: options.category ? { category: options.category } : { isNot: null },
    ...(options.createdSince ? { createdAt: { gte: options.createdSince } } : {}),
    ...(query
      ? {
          OR: [
            { repoName: { contains: query, mode: "insensitive" } },
            { owner: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { language: { contains: query, mode: "insensitive" } },
            { topics: { hasSome: [query.toLowerCase()] } },
            { analysis: { is: { aiSummary: { contains: query, mode: "insensitive" } } } },
            { analysis: { is: { tags: { hasSome: [query] } } } },
            { analysis: { is: { frameworks: { hasSome: [query] } } } },
          ],
        }
      : {}),
  };
}

export async function searchProjects(options: {
  query?: string;
  category?: Category;
  createdSince?: Date;
  take?: number;
  skip?: number;
  order?: "stars" | "recent";
}) {
  const orderBy =
    options.order === "recent"
      ? ([{ createdAt: "desc" as const }, { stars: "desc" as const }] as const)
      : ([{ stars: "desc" as const }, { createdAt: "desc" as const }] as const);

  return prisma.project.findMany({
    where: projectSearchWhere(options),
    include: { analysis: true },
    orderBy: [...orderBy],
    ...(options.take != null ? { take: options.take } : {}),
    ...(options.skip != null ? { skip: options.skip } : {}),
  });
}

export async function countProjects(
  options: { query?: string; category?: Category; createdSince?: Date } = {},
) {
  return prisma.project.count({ where: projectSearchWhere(options) });
}

/** Published projects whose record was created since UTC midnight. */
export async function countPublishedProjectsAddedToday(since: Date) {
  return prisma.project.count({
    where: {
      status: ProjectStatus.published,
      analysis: { isNot: null },
      createdAt: { gte: since },
    },
  });
}

export async function getPublishedProject(slug: string) {
  return prisma.project.findFirst({
    where: { slug, status: ProjectStatus.published },
    include: { analysis: true },
  });
}

export async function getTrending(take = 6) {
  return prisma.project.findMany({
    where: { status: ProjectStatus.published, analysis: { isNot: null } },
    include: { analysis: true },
    orderBy: { stars: "desc" },
    take,
  });
}

export async function getRecentlyAdded(take = 6) {
  return prisma.project.findMany({
    where: { status: ProjectStatus.published, analysis: { isNot: null } },
    include: { analysis: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getCategoryCounts(options: { createdSince?: Date } = {}) {
  const grouped = await prisma.projectAnalysis.groupBy({
    by: ["category"],
    where: {
      project: {
        status: ProjectStatus.published,
        ...(options.createdSince ? { createdAt: { gte: options.createdSince } } : {}),
      },
    },
    _count: { category: true },
  });
  return Object.fromEntries(grouped.map((row) => [row.category, row._count.category])) as Partial<
    Record<Category, number>
  >;
}
