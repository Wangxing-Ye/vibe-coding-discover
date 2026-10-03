import Link from "next/link";
import { CategoryPills } from "@/components/CategoryPills";
import { ClaimSection } from "@/components/ClaimSection";
import { ProjectCard, ProjectGrid } from "@/components/ProjectCard";
import { SearchBox } from "@/components/SearchBox";
import { UseCaseGrid } from "@/components/UseCaseGrid";
import { getRecentlyAdded, countProjects, countPublishedProjectsAddedToday } from "@/lib/search";
import { SITE_DESCRIPTION } from "@/lib/site";
import { getTodayRecommendations } from "@/lib/today-recommendation";
import { formatUtcMmDdYyyy, startOfTodayUtc } from "@/lib/catalog-day";
import { countUseCases, countUseCasesAddedToday, getTopUseCases } from "@/lib/use-cases";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const todayStart = startOfTodayUtc();
  const [recent, todayRecs, publishedCount, useCaseCount, todayProjects, todayUseCases, topUseCases] =
    await Promise.all([
      getRecentlyAdded(8),
      getTodayRecommendations(3),
      countProjects(),
      countUseCases(),
      countPublishedProjectsAddedToday(todayStart),
      countUseCasesAddedToday(todayStart),
      getTopUseCases(8),
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
          Today ({formatUtcMmDdYyyy(todayStart)} UTC):{" "}
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
