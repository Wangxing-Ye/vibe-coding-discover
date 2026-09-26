import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GithubClick } from "@/components/GithubClick";
import { ProjectView } from "@/components/ProjectView";
import { categoryLabel, getCategoryMeta } from "@/lib/categories";
import { formatStars } from "@/lib/format";
import { getPublishedProject } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) return {};
  const description = project.analysis?.aiSummary || project.description || `${project.owner}/${project.repoName}`;
  return {
    title: project.repoName,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.repoName,
      description,
      url: `/projects/${project.slug}`,
    },
  };
}

function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 text-[15px] leading-7 text-secondary">
      <dt className="font-medium text-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project || !project.analysis) notFound();

  const analysis = project.analysis;
  const language = project.language?.trim() || "";
  const frameworks = analysis.frameworks.map((item) => item.trim()).filter(Boolean);
  const tags = analysis.tags.map((item) => item.trim()).filter(Boolean);
  const showBuiltWith = Boolean(language) || frameworks.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <ProjectView slug={project.slug} githubUrl={project.githubUrl} />
      <p className="text-sm text-secondary">
        <Link href={`/category/${getCategoryMeta(analysis.category).slug}`} className="hover:text-foreground">
          {categoryLabel(analysis.category)}
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 flex-1 text-4xl font-semibold tracking-tight">{project.repoName}</h1>
        <GithubClick href={project.githubUrl} slug={project.slug} />
      </div>
      {project.description ? <p className="mt-3 text-base leading-7 text-secondary">{project.description}</p> : null}

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-secondary">
        <span>★ {formatStars(project.stars)}</span>
        <span>{project.forks.toLocaleString()} forks</span>
        {language ? <span>{language}</span> : null}
        {project.license ? <span>{project.license}</span> : <span>—</span>}
        <a
          href={`https://github.com/${project.owner}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground hover:underline"
        >
          {project.owner}
        </a>
      </div>

      <hr className="my-10 border-border" />

      <p className="text-[15px] font-medium leading-7 text-foreground">{analysis.aiSummary}</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Use Cases</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.useCases.map((item) => (
            <span key={item} className="rounded-full border border-border px-3 py-1 text-sm text-accent">
              {item}
            </span>
          ))}
        </div>
      </section>

      {showBuiltWith ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Built With</h2>
          <dl className="mt-3 space-y-2">
            {language ? <StackRow label="Language" value={language} /> : null}
            {frameworks.length > 0 ? <StackRow label="Frameworks" value={frameworks.join(" · ")} /> : null}
          </dl>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Tags</h2>
          <p className="mt-3 text-[15px] leading-7 text-secondary">{tags.join(" · ")}</p>
        </section>
      ) : null}
    </div>
  );
}
