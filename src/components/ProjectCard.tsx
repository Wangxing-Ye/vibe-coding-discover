import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { categoryLabel, getCategoryMeta } from "@/lib/categories";
import { formatStars } from "@/lib/format";

export type ProjectWithAnalysis = Prisma.ProjectGetPayload<{ include: { analysis: true } }>;

function normalizeMeta(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function cardMetaLine(project: ProjectWithAnalysis) {
  const category = project.analysis ? categoryLabel(project.analysis.category) : "Project";
  const language = project.language?.trim() || "";
  const blocked = new Set(
    [language, category, project.analysis?.category, project.analysis ? getCategoryMeta(project.analysis.category).slug : ""]
      .filter((item): item is string => Boolean(item))
      .map(normalizeMeta),
  );

  const tags = (project.analysis?.tags ?? [])
    .map((item) => item.trim())
    .filter((item, index, all) => {
      if (!item || blocked.has(normalizeMeta(item))) return false;
      return all.findIndex((other) => normalizeMeta(other) === normalizeMeta(item)) === index;
    })
    .slice(0, 2);

  const rest = [language, ...tags].filter(Boolean);
  return rest.length ? `${category} | ${rest.join(" · ")}` : category;
}

export function ProjectCard({
  project,
  rank,
}: {
  project: ProjectWithAnalysis;
  rank?: number;
}) {
  const summary = project.analysis?.aiSummary || project.description || "Open source project on GitHub.";

  return (
    <article className="relative flex h-full flex-col rounded-xl border border-border bg-background p-5">
      {rank != null ? (
        <span
          className="absolute left-1/2 top-0 z-10 flex size-[2.475rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-xl font-semibold text-foreground"
          aria-label={`Rank ${rank}`}
        >
          {rank}
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{project.repoName}</h3>
        <span className="shrink-0 text-sm text-secondary">★ {formatStars(project.stars)}</span>
      </div>
      <p className="mt-3 line-clamp-3 max-h-[4.5rem] overflow-hidden text-sm leading-6 text-secondary">{summary}</p>
      <p className="mt-4 text-xs text-secondary">{cardMetaLine(project)}</p>
      <div className="flex-1" />
      <Link
        href={`/projects/${project.slug}`}
        className="mt-5 inline-flex text-sm font-medium text-accent hover:underline"
      >
        View Project →
      </Link>
    </article>
  );
}

export function ProjectGrid({ projects }: { projects: ProjectWithAnalysis[] }) {
  if (projects.length === 0) {
    return <p className="text-sm text-secondary">No projects yet. Check back soon.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
