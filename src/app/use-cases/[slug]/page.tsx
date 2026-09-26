import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProjectGrid } from "@/components/ProjectCard";
import { getProjectsForUseCase, getUseCaseBySlug } from "@/lib/use-cases";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const useCase = await getUseCaseBySlug(slug);
  if (!useCase) return {};
  return {
    title: useCase.name,
    description: `Open source projects for ${useCase.name}.`,
    alternates: { canonical: `/use-cases/${useCase.slug}` },
  };
}

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const useCase = await getUseCaseBySlug(slug);
  if (!useCase) notFound();

  const projects = await getProjectsForUseCase(useCase.slug);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6">
      <p className="text-sm text-secondary">
        <Link href="/use-cases" className="hover:text-foreground">
          Use Cases
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{useCase.name}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
        Published projects tagged with this use case.
      </p>
      <p className="mt-8 text-sm text-secondary">
        {projects.length} project{projects.length === 1 ? "" : "s"}
      </p>
      <div className="mt-6">
        <ProjectGrid projects={projects} />
      </div>
    </div>
  );
}
