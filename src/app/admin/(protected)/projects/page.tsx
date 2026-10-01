import Link from "next/link";
import { Category, ProjectStatus, type Prisma } from "@prisma/client";
import { AdminProjectFilters } from "@/app/admin/ProjectFilters";
import { parseMmDdYyyyLocalDay } from "@/lib/catalog-day";
import { CATEGORY_IDS, categoryLabel } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { buildTodayTxtIntro, categoryCountsFromProjects, formatLocalMmDdYyyy, projectsToExportRows } from "@/lib/export-projects-csv";
import { formatUpdatedAt } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES = new Set<string>(Object.values(ProjectStatus));
const CATEGORIES = new Set<string>(CATEGORY_IDS);
const LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "GPL-3.0",
  "AGPL-3.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "MPL-2.0",
  "Custom",
  "none",
]);

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    updated?: string;
    status?: string;
    category?: string;
    license?: string;
    order?: string;
    notice?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const updated = params.updated?.trim() || "";
  const updatedDay = parseMmDdYyyyLocalDay(updated);
  const status = params.status && STATUSES.has(params.status) ? (params.status as ProjectStatus) : undefined;
  const category = params.category && CATEGORIES.has(params.category) ? (params.category as Category) : undefined;
  const license = params.license && LICENSES.has(params.license) ? params.license : "";
  const order = params.order === "stars" ? "stars" : "updated";
  const deletedNotice = params.notice === "deleted";

  const and: Prisma.ProjectWhereInput[] = [];
  if (status) and.push({ status });
  if (category) and.push({ analysis: { category } });
  if (license === "none") and.push({ OR: [{ license: null }, { license: "" }] });
  else if (license) and.push({ license });
  if (q) {
    and.push({
      OR: [
        { owner: { contains: q, mode: "insensitive" } },
        { repoName: { contains: q, mode: "insensitive" } },
        { githubUrl: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (updatedDay) and.push({ updatedAt: { gte: updatedDay.start, lt: updatedDay.end } });
  const whereQuery: Prisma.ProjectWhereInput = and.length ? { AND: and } : {};

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: whereQuery,
      include: { analysis: true },
      orderBy: order === "stars" ? { stars: "desc" } : { updatedAt: "desc" },
    }),
    prisma.project.count({ where: whereQuery }),
  ]);

  return (
    <div>
      {deletedNotice ? (
        <p className="mb-6 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
          Project deleted.
        </p>
      ) : null}
      <h2 className="text-lg font-semibold tracking-tight">All projects</h2>
      <AdminProjectFilters
        q={q}
        updated={updated}
        status={status || ""}
        category={category || ""}
        license={license}
        order={order}
        exportRows={projectsToExportRows(projects)}
        txtIntro={
          updatedDay
            ? buildTodayTxtIntro(categoryCountsFromProjects(projects), {
                dateLabel: formatLocalMmDdYyyy(updatedDay.start),
              })
            : undefined
        }
      />
      <p className="mt-4 text-sm text-secondary">
        {total} project{total === 1 ? "" : "s"}
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Stars</th>
              <th className="px-4 py-3 font-medium">License</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-secondary" colSpan={6}>
                  No projects match these filters.
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${project.id}`} className="hover:underline">
                      {project.owner}/{project.repoName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {project.analysis ? categoryLabel(project.analysis.category) : "—"}
                  </td>
                  <td className="px-4 py-3 text-secondary">{project.stars.toLocaleString()}</td>
                  <td className="px-4 py-3 text-secondary">{project.license || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-secondary">{formatUpdatedAt(project.updatedAt)}</td>
                  <td className="px-4 py-3 text-secondary">{project.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
