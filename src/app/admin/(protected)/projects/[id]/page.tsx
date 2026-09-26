import { notFound } from "next/navigation";
import { AdminActionButton } from "@/app/admin/ActionButton";
import { DeleteProjectButton } from "@/app/admin/DeleteProjectButton";
import { SetLicenseButton } from "@/app/admin/SetLicenseButton";
import { CATEGORIES } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { publishProject, reanalyzeProject, rejectProject, saveProjectProfile } from "../../../actions";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  published: "Published. This project is now live on the site.",
  rejected: "Rejected. This project will not appear on the site.",
  saved: "Profile saved.",
  reanalyzed: "Re-analysis complete.",
  ai_failed: "AI analysis failed. The project is in draft until reviewed.",
  license_saved: "License updated.",
  license_required: "License cannot be empty.",
};

export default async function AdminProjectDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { analysis: true },
  });
  if (!project) notFound();
  const analysis = project.analysis;
  const noticeText = notice ? NOTICES[notice] : null;
  const license = project.license?.trim() || "";
  const needsLicense = !license || license.toLowerCase() === "custom";

  return (
    <div className="max-w-3xl">
      {noticeText ? (
        <p className="mb-6 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
          {noticeText}
        </p>
      ) : null}
      <p className="text-sm text-secondary">{project.status}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">
        {project.owner}/{project.repoName}
      </h2>
      <a href={project.githubUrl} className="mt-2 inline-block text-sm text-accent hover:underline" target="_blank" rel="noreferrer">
        {project.githubUrl}
      </a>
      <p className="mt-3 text-sm text-secondary">
        ★ {project.stars.toLocaleString()} · {project.language || "Unknown"} · {project.license || "—"}
        {analysis && !analysis.inScope ? " · Out of catalog" : ""}
      </p>
      {analysis && !analysis.inScope ? (
        <p className="mt-3 text-sm text-warning">
          Out of catalog: not an AI/Agent/MCP/RAG/Skills/Framework project. Publishing is a manual override.
        </p>
      ) : null}

      {analysis ? (
        <form action={saveProjectProfile.bind(null, project.id)} className="mt-8 space-y-4">
          <label className="block text-sm">
            Category
            <select
              name="category"
              defaultValue={analysis.category}
              className="mt-1 h-11 w-full rounded-xl border border-border px-3 text-sm"
            >
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            AI Summary
            <textarea
              name="aiSummary"
              defaultValue={analysis.aiSummary}
              rows={4}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Tags (comma separated)
            <input name="tags" defaultValue={analysis.tags.join(", ")} className="mt-1 h-11 w-full rounded-xl border border-border px-3 text-sm" />
          </label>
          <label className="block text-sm">
            Use cases
            <input name="useCases" defaultValue={analysis.useCases.join(", ")} className="mt-1 h-11 w-full rounded-xl border border-border px-3 text-sm" />
          </label>
          <label className="block text-sm">
            Frameworks
            <input name="frameworks" defaultValue={analysis.frameworks.join(", ")} className="mt-1 h-11 w-full rounded-xl border border-border px-3 text-sm" />
          </label>
          <AdminActionButton
            pendingLabel="Saving…"
            className="h-11 cursor-pointer rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-90"
          >
            Save profile
          </AdminActionButton>
        </form>
      ) : (
        <p className="mt-8 text-sm text-secondary">No analysis yet. Run re-analyze.</p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <form action={publishProject.bind(null, project.id)}>
          <AdminActionButton
            pendingLabel="Publishing…"
            className="h-11 cursor-pointer rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-90"
          >
            Publish
          </AdminActionButton>
        </form>
        <form action={rejectProject.bind(null, project.id)}>
          <AdminActionButton
            pendingLabel="Rejecting…"
            className="h-11 cursor-pointer rounded-full border border-border px-5 text-sm hover:border-foreground"
          >
            Reject
          </AdminActionButton>
        </form>
        <form action={reanalyzeProject.bind(null, project.id)}>
          <AdminActionButton
            pendingLabel="Analyzing…"
            className="h-11 cursor-pointer rounded-full border border-border px-5 text-sm hover:border-foreground"
          >
            Re-analyze
          </AdminActionButton>
        </form>
        {needsLicense ? <SetLicenseButton projectId={project.id} /> : null}
        <DeleteProjectButton projectId={project.id} label={`${project.owner}/${project.repoName}`} />
      </div>
    </div>
  );
}
