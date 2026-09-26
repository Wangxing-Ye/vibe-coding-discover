import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_SIZE, PaginationBar, parsePage, totalPages } from "@/components/PaginationBar";
import { SearchBox } from "@/components/SearchBox";
import { UseCaseGrid } from "@/components/UseCaseGrid";
import { UseCaseQuickFilters } from "@/components/UseCaseQuickFilters";
import { getUseCasesPage, startOfTodayLocal } from "@/lib/use-cases";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Use Cases",
  description: "Discover AI open source projects filtered by use case and real-world tags.",
  alternates: { canonical: "/use-cases" },
};

export default async function UseCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; period?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const period = params.period === "today" ? "today" : "all";

  const createdSince = period === "today" ? startOfTodayLocal() : undefined;
  let page = parsePage(params.page);
  let { items: pageItems, total } = await getUseCasesPage({
    query,
    createdSince,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const pages = totalPages(total);
  if (page > pages) {
    page = pages;
    ({ items: pageItems, total } = await getUseCasesPage({
      query,
      createdSince,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }));
  }

  function href(next: { page?: number; period?: "all" | "today" }) {
    const nextParams = new URLSearchParams();
    if (query) nextParams.set("q", query);
    const nextPeriod = next.period ?? period;
    if (nextPeriod === "today") nextParams.set("period", "today");
    if (next.page && next.page > 1) nextParams.set("page", String(next.page));
    const qs = nextParams.toString();
    return qs ? `/use-cases?${qs}` : "/use-cases";
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Use Cases</h1>
      <div className="mt-6 max-w-xl">
        <SearchBox
          initialQuery={query}
          size="sm"
          basePath="/use-cases"
          period={period === "today" ? "today" : undefined}
          label="Search use case by its name"
          placeholder="Search use cases by name..."
        />
      </div>
      <div className="mt-6">
        <UseCaseQuickFilters activeQuery={query} period={period === "today" ? "today" : undefined} />
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary">
          {`${total} use case${total === 1 ? "" : "s"}${query ? ` for “${query}”` : ""}${
            period === "today" ? " today" : ""
          }`}
        </p>
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
      <div className="mt-6">
        <UseCaseGrid
          useCases={pageItems}
          empty={
            query
              ? "No use cases match that name."
              : period === "today"
                ? "No use cases added today."
                : "No use cases yet."
          }
        />
      </div>
      <PaginationBar page={page} totalPages={pages} makeHref={(nextPage) => href({ page: nextPage })} />
    </div>
  );
}
