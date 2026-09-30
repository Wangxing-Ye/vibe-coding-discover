import { Suspense } from "react";
import Link from "next/link";
import { CategoryPills } from "@/components/CategoryPills";
import { ProjectGrid } from "@/components/ProjectCard";
import { ProjectListTable } from "@/components/ProjectListTable";
import { ExploreViewToggle } from "@/components/ExploreViewToggle";
import { ExploreOrderToggle } from "@/components/ExploreOrderToggle";
import { PAGE_SIZE, PaginationBar, parsePage, totalPages } from "@/components/PaginationBar";
import { SearchBox } from "@/components/SearchBox";
import { ExportProjectsButton } from "@/components/ExportProjectsButton";
import { getCategoryBySlug } from "@/lib/categories";
import { buildTodayTxtIntro, projectsToExportRows } from "@/lib/export-projects-csv";
import { countProjects, getCategoryCounts, searchProjects } from "@/lib/search";
import { startOfTodayLocal } from "@/lib/use-cases";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    order?: string;
    view?: string;
    page?: string;
    period?: string;
  }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const category = params.category ? getCategoryBySlug(params.category) : undefined;
  const order = params.order === "recent" ? "recent" : "stars";
  const view = params.view === "list" ? "list" : "cards";
  const period = params.period === "today" ? "today" : "all";
  const createdSince = period === "today" ? startOfTodayLocal() : undefined;

  const [total, todayCounts] = await Promise.all([
    countProjects({ query, category: category?.id, createdSince }),
    period === "today" ? getCategoryCounts({ createdSince }) : Promise.resolve(undefined),
  ]);
  const pages = totalPages(total);
  const page = Math.min(parsePage(params.page), pages);

  const projects = await searchProjects({
    query,
    category: category?.id,
    createdSince,
    order,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });
  const txtIntro = todayCounts ? buildTodayTxtIntro(todayCounts) : undefined;

  function href(next: { page?: number; period?: "all" | "today" }) {
    const nextParams = new URLSearchParams();
    if (query) nextParams.set("q", query);
    if (order === "recent") nextParams.set("order", "recent");
    if (view === "list") nextParams.set("view", "list");
    if (category) nextParams.set("category", category.slug);
    const nextPeriod = next.period ?? period;
    if (nextPeriod === "today") nextParams.set("period", "today");
    if (next.page && next.page > 1) nextParams.set("page", String(next.page));
    const qs = nextParams.toString();
    return qs ? `/explore?${qs}` : "/explore";
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Explore</h1>
      <div className="mt-6 max-w-xl">
        <SearchBox
          initialQuery={query}
          size="sm"
          placeholder="Search projects by name, stack, or category..."
          order={order}
          view={view}
          period={period === "today" ? "today" : undefined}
        />
      </div>
      <div className="mt-6">
        <CategoryPills active={category?.slug} />
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary">
          {`${total} project${total === 1 ? "" : "s"}${query ? ` for “${query}”` : ""}${
            period === "today" ? " today" : ""
          }${order === "recent" ? " · newest first" : ""}`}
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
          <ExportProjectsButton rows={projectsToExportRows(projects)} txtIntro={txtIntro} />
        </div>
      </div>
      <div className="mt-6">
        {view === "list" ? <ProjectListTable projects={projects} /> : <ProjectGrid projects={projects} />}
      </div>
      <PaginationBar page={page} totalPages={pages} makeHref={(nextPage) => href({ page: nextPage })} />
    </div>
  );
}
