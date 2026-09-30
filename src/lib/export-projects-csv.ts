import type { Category } from "@prisma/client";
import { categoryLabel } from "@/lib/categories";
import type { ProjectWithAnalysis } from "@/components/ProjectCard";

const TODAY_INTRO_CATEGORY_ORDER: Category[] = [
  "AI_AGENTS",
  "SKILLS",
  "MCP",
  "AI_TOOLS",
  "AI_CODING",
  "RAG",
  "AI_FRAMEWORKS",
];

export type ExportProjectRow = {
  name: string;
  stars: number;
  category: string;
  language: string;
  tags: string;
  slug: string;
  summary: string;
};

export function projectsToExportRows(projects: ProjectWithAnalysis[]): ExportProjectRow[] {
  return projects.map((project) => ({
    name: project.repoName,
    stars: project.stars,
    category: project.analysis ? categoryLabel(project.analysis.category) : "",
    language: project.language?.trim() || "",
    tags: (project.analysis?.tags ?? []).map((tag) => tag.trim()).filter(Boolean).join(" · "),
    slug: project.slug,
    summary: (project.analysis?.aiSummary || project.description || "").trim(),
  }));
}

export function utcYyyyMmDd(now = new Date()) {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export function exportDownloadFilename(ext: "csv" | "txt", now = new Date()) {
  return `vibecodingdiscover-${utcYyyyMmDd(now)}.${ext}`;
}

function joinWithAnd(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function buildTodayTxtIntro(counts: Partial<Record<Category, number>>, now = new Date()) {
  const total = TODAY_INTRO_CATEGORY_ORDER.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  const headline = `Today (${utcYyyyMmDd(now)} UTC), ${total} AI open source ${
    total === 1 ? "project was" : "projects were"
  } discovered and analyzed.`;
  const parts = TODAY_INTRO_CATEGORY_ORDER.flatMap((id) => {
    const count = counts[id] ?? 0;
    return count > 0 ? [`${count} ${categoryLabel(id)}`] : [];
  });
  if (parts.length === 0) return headline;
  return `${headline} ${joinWithAnd(parts)}.`;
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function projectPageUrl(origin: string, slug: string) {
  return `${origin.replace(/\/$/, "")}/projects/${slug}`;
}

export function buildProjectsCsv(rows: ExportProjectRow[], origin: string) {
  const header = [
    "Project name",
    "Stars",
    "Category",
    "Language",
    "Tags",
    "Project link",
    "Summary",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvCell(row.name),
        csvCell(row.stars),
        csvCell(row.category),
        csvCell(row.language),
        csvCell(row.tags),
        csvCell(projectPageUrl(origin, row.slug)),
        csvCell(row.summary),
      ].join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function buildProjectsTxt(rows: ExportProjectRow[], origin: string, intro?: string) {
  const body = rows
    .map((row, index) => {
      const summary = row.summary.replace(/\s+/g, " ").trim();
      return [
        `#${index + 1} ${row.name}   ${projectPageUrl(origin, row.slug)}`,
        `Stars: ${row.stars}`,
        `Category: ${row.category}`,
        summary,
      ].join("\n");
    })
    .join("\n\n");
  if (!intro) return body;
  return body ? `${intro}\n\n${body}` : intro;
}
