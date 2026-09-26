import Link from "next/link";
import { CategoryPills } from "@/components/CategoryPills";
import { ClaimSection } from "@/components/ClaimSection";
import { ProjectCard, ProjectGrid } from "@/components/ProjectCard";
import { SearchBox } from "@/components/SearchBox";
import { UseCaseGrid } from "@/components/UseCaseGrid";
import { UseCaseQuickFilters } from "@/components/UseCaseQuickFilters";
import { CATEGORIES } from "@/lib/categories";
import { getCategoryCounts, getRecentlyAdded, getTrending, countProjects, countPublishedProjectsAddedToday } from "@/lib/search";
import { SITE_DESCRIPTION } from "@/lib/site";
import { getTodayRecommendations } from "@/lib/today-recommendation";
import { countUseCases, countUseCasesAddedToday, getTopUseCases } from "@/lib/use-cases";

export const dynamic = "force-dynamic";

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatMmDdYyyy(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export default async function HomePage() {
  const todayStart = startOfTodayLocal();
  const [trending, recent, todayRecs, counts, topUseCases, publishedCount, useCaseCount, todayProjects, todayUseCases] =
    await Promise.all([
      getTrending(8),
      getRecentlyAdded(8),
      getTodayRecommendations(3),
      getCategoryCounts(),
      getTopUseCases(8),
      countProjects(),
      countUseCases(),
      countPublishedProjectsAddedToday(todayStart),
      countUseCasesAddedToday(todayStart),
    ]);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 sm:py-20">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Discover AI Open Source
          <br />
          for Vibe Coding
        </h1>
        <p className="mt-5 text-base leading-7 text-secondary sm:text-lg">{SITE_DESCRIPTION}</p>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchBox placeholder={`Search ${publishedCount.toLocaleString()} projects...`} />
        </div>
        <p className="mt-3 text-sm text-accent">
          Today ({formatMmDdYyyy(todayStart)}):{" "}
          <Link href="/explore?period=today" className="hover:underline">
            +{todayProjects.toLocaleString()} projects
          </Link>
          ,{" "}
          <Link href="/use-cases?period=today" className="hover:underline">
            +{todayUseCases.toLocaleString()} use cases
          </Link>
        </p>
        <div className="mt-6">
          <CategoryPills className="justify-center" />
        </div>
      </section>

      {todayRecs.length > 0 ? (
        <section className="mt-20">
          <h2 className="mb-6 text-center text-xl font-semibold tracking-tight">Today&apos;s Recommendations</h2>
          <div className="mx-auto grid max-w-5xl gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {todayRecs.map((project, index) => (
              <ProjectCard key={project.id} project={project} rank={index + 1} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-20">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recently Added</h2>
          <Link href="/explore?order=recent" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        <ProjectGrid projects={recent} />
      </section>

      <section className="mt-20">
        <h2 className="mb-6 text-xl font-semibold tracking-tight">Explore Categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-foreground hover:bg-[#f4f4f5] active:bg-[#ebebeb]"
            >
              <p className="font-medium text-foreground">{category.name}</p>
              <p className="mt-1 text-sm text-secondary">
                {counts[category.id] ?? 0} projects
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Use Cases{" "}
            <span className="text-base font-normal text-secondary">({useCaseCount.toLocaleString()})</span>
          </h2>
          <Link href="/use-cases" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        {topUseCases.length > 0 ? <UseCaseGrid useCases={topUseCases} /> : null}
        <div className={topUseCases.length > 0 ? "mt-6" : undefined}>
          <UseCaseQuickFilters />
        </div>
      </section>

      <section className="mt-20">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Trending Projects</h2>
          <Link href="/explore" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        <ProjectGrid projects={trending} />
      </section>

      <ClaimSection />

      <section className="mt-20 rounded-2xl border border-border px-6 py-10 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Have an AI Open Source Project?</h2>
        <p className="mt-2 text-sm text-secondary">
          Submit a GitHub repository or an X recommendation. No login required.
        </p>
        <Link
          href="/submit"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background"
        >
          Submit Project
        </Link>
      </section>
    </div>
  );
}
