import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";
import { ProjectStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, useCases] = await Promise.all([
    prisma.project.findMany({
      where: { status: ProjectStatus.published },
      select: { slug: true, updatedAt: true },
    }),
    prisma.useCase.findMany({
      where: { projects: { some: { project: { status: ProjectStatus.published } } } },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    { url: absoluteUrl("/"), lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/explore"), lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/use-cases"), lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: absoluteUrl("/submit"), lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/terms"), lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...CATEGORIES.map((category) => ({
      url: absoluteUrl(`/category/${category.slug}`),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...useCases.map((useCase) => ({
      url: absoluteUrl(`/use-cases/${useCase.slug}`),
      lastModified: useCase.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: project.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
