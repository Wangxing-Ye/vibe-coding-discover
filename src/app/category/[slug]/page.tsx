import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CategoryPills } from "@/components/CategoryPills";
import { ExploreOrderToggle } from "@/components/ExploreOrderToggle";
import { ExploreViewToggle } from "@/components/ExploreViewToggle";
import { PAGE_SIZE, PaginationBar, parsePage, totalPages } from "@/components/PaginationBar";
import { ProjectGrid } from "@/components/ProjectCard";
import { ProjectListTable } from "@/components/ProjectListTable";
import { getCategoryBySlug } from "@/lib/categories";
import { countProjects, searchProjects } from "@/lib/search";
import { startOfTodayLocal } from "@/lib/use-cases";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; page?: string; order?: string; period?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  const categorySlug = category.slug;

  const view = query.view === "list" ? "list" : "cards";
  const order = query.order === "recent" ? "recent" : "stars";
  const period = query.period === "today" ? "today" : "all";
  const createdSince = period === "today" ? startOfTodayLocal() : undefined;

  const total = await countProjects({ category: category.id, createdSince });
  const pages = totalPages(total);
  const page = Math.min(parsePage(query.page), pages);
  const projects = await searchProjects({
    category: category.id,
    createdSince,
    order,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  function href(next: { page?: number; period?: "all" | "today" }) {
    const nextParams = new URLSearchParams();
    if (order === "recent") nextParams.set("order", "recent");
    if (view === "list") nextParams.set("view", "list");
    const nextPeriod = next.period ?? period;
    if (nextPeriod === "today") nextParams.set("period", "today");
    if (next.page && next.page > 1) nextParams.set("page", String(next.page));
    const qs = nextParams.toString();
    return qs ? `/category/${categorySlug}?${qs}` : `/category/${categorySlug}`;
  }

  const pillQuery = new URLSearchParams();
  if (order === "recent") pillQuery.set("order", "recent");
  if (view === "list") pillQuery.set("view", "list");
  if (period === "today") pillQuery.set("period", "today");
  const pillSearch = pillQuery.toString();

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6">
      <p className="text-sm text-secondary">Category</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{category.name}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">{category.description}</p>
      <div className="mt-6">
        <CategoryPills active={category.slug} extraSearch={pillSearch || undefined} />
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary">
          {`${total} project${total === 1 ? "" : "s"}${period === "today" ? " today" : ""}${
            order === "recent" ? " · newest first" : ""
          }`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <div className="flex flex-wrap items-center gap-2">
              <ExploreViewToggle />
              <ExploreOrderToggle />
            </div>
          </Suspense>
          <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
            <Link
              href={href({ period: "all" })}
              aria-current={period === "all" ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 ${
                period === "all" ? "bg-foreground text-background" : "text-secondary hover:text-foreground"
              }`}
            >
              All Time
            </Link>
            <Link
              href={href({ period: "today" })}
              aria-current={period === "today" ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 ${
                period === "today" ? "bg-foreground text-background" : "text-secondary hover:text-foreground"
              }`}
            >
              Today
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-6">
        {view === "list" ? <ProjectListTable projects={projects} /> : <ProjectGrid projects={projects} />}
      </div>
      <PaginationBar page={page} totalPages={pages} makeHref={(nextPage) => href({ page: nextPage })} />
    </div>
  );
}
