import Link from "next/link";
import { categoryLabel } from "@/lib/categories";
import { formatStars } from "@/lib/format";
import type { ProjectWithAnalysis } from "@/components/ProjectCard";

export function ProjectListTable({ projects }: { projects: ProjectWithAnalysis[] }) {
  if (projects.length === 0) {
    return <p className="text-sm text-secondary">No projects yet. Check back soon.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-[#fafafa] text-xs font-medium uppercase tracking-wide text-secondary">
          <tr>
            <th className="whitespace-nowrap px-4 py-3">Project name</th>
            <th className="whitespace-nowrap px-4 py-3">Stars</th>
            <th className="whitespace-nowrap px-4 py-3">Category</th>
            <th className="whitespace-nowrap px-4 py-3">Language</th>
            <th className="px-4 py-3">Tags</th>
            <th className="px-4 py-3">Summary</th>
            <th className="whitespace-nowrap px-4 py-3">View Project</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const summary = project.analysis?.aiSummary || project.description || "—";
            const tags = (project.analysis?.tags ?? []).filter(Boolean);
            return (
              <tr key={project.id} className="border-b border-border last:border-b-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{project.repoName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-secondary">★ {formatStars(project.stars)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-secondary">
                  {project.analysis ? categoryLabel(project.analysis.category) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-secondary">{project.language || "—"}</td>
                <td className="max-w-[14rem] px-4 py-3 text-secondary">
                  <span className="line-clamp-2">{tags.length ? tags.join(" · ") : "—"}</span>
                </td>
                <td className="min-w-[16rem] max-w-md px-4 py-3 text-secondary">
                  <span className="line-clamp-2">{summary}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Link href={`/projects/${project.slug}`} className="font-medium text-accent hover:underline">
                    View Project →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
