import Link from "next/link";
import { ProjectStatus, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { retrySubmission } from "../actions";

export const dynamic = "force-dynamic";

type AdminProjectRow = {
  id: string;
  owner: string;
  repoName: string;
  githubUrl: string;
  license: string | null;
};

function ProjectList({
  projects,
  empty,
}: {
  projects: AdminProjectRow[];
  empty: string;
}) {
  return (
    <div className="mt-4 divide-y divide-border rounded-xl border border-border">
      {projects.length === 0 ? (
        <p className="p-4 text-sm text-secondary">{empty}</p>
      ) : (
        projects.map((project) => (
          <div key={project.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {project.owner}/{project.repoName}
              </p>
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-sm text-accent hover:underline"
              >
                {project.githubUrl}
              </a>
              <p className="mt-1 text-sm text-secondary">{project.license || "no license"}</p>
            </div>
            <Link href={`/admin/projects/${project.id}`} className="shrink-0 text-sm text-accent hover:underline">
              Open
            </Link>
          </div>
        ))
      )}
    </div>
  );
}

export default async function AdminHomePage() {
  const [submissions, queueCount, drafts, rejected, published, draftProjects, rejectedProjects] = await Promise.all([
    prisma.submission.findMany({
      where: { status: { in: [SubmissionStatus.needs_review, SubmissionStatus.pending, SubmissionStatus.analyzing] } },
      include: { project: { include: { analysis: true } } },
      orderBy: { submittedAt: "desc" },
      take: 50,
    }),
    prisma.submission.count({
      where: { status: { in: [SubmissionStatus.needs_review, SubmissionStatus.pending, SubmissionStatus.analyzing] } },
    }),
    prisma.project.count({ where: { status: ProjectStatus.draft } }),
    prisma.project.count({ where: { status: ProjectStatus.rejected } }),
    prisma.project.count({ where: { status: ProjectStatus.published } }),
    prisma.project.findMany({
      where: { status: ProjectStatus.draft },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.project.findMany({
      where: { status: ProjectStatus.rejected },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-10">
      <div className="flex gap-6 text-sm text-secondary">
        <span>{published} published</span>
        <span>{drafts} drafts</span>
        <span>{rejected} rejected</span>
        <span>{queueCount} in queue</span>
        <Link href="/admin/projects" className="text-accent hover:underline">
          All projects
        </Link>
        <Link href="/admin/recommendations" className="text-accent hover:underline">
          Today&apos;s Recommendations
        </Link>
        <Link href="/admin/watchlist" className="text-accent hover:underline">
          Watch list
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Submissions ({queueCount})</h2>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border">
          {submissions.length === 0 ? (
            <p className="p-4 text-sm text-secondary">No pending submissions.</p>
          ) : (
            submissions.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {item.sourceType === "x"
                      ? "X"
                      : item.sourceType === "youtube"
                        ? "YouTube"
                        : item.sourceType === "trending"
                          ? "Trending"
                          : "GitHub"}{" "}
                    · {item.status}
                  </p>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all text-sm text-accent hover:underline"
                  >
                    {item.sourceUrl}
                  </a>
                  {item.notes ? <p className="mt-1 text-xs text-warning">{item.notes}</p> : null}
                </div>
                <div className="flex gap-3 text-sm">
                  {item.projectId ? (
                    <Link href={`/admin/projects/${item.projectId}`} className="text-accent hover:underline">
                      Review
                    </Link>
                  ) : (
                    <form action={retrySubmission.bind(null, item.id)}>
                      <button className="text-accent hover:underline">Retry</button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Drafts ({drafts})</h2>
        <ProjectList projects={draftProjects} empty="No drafts." />
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Rejected ({rejected})</h2>
        <ProjectList projects={rejectedProjects} empty="No rejected projects." />
      </section>
    </div>
  );
}
