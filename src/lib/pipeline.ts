import { Category, ProjectStatus, SubmissionStatus, SyncStatus } from "@prisma/client";
import { prisma } from "./db";
import { analyzeProject, hasAiConfigured, type StructuredAnalysis } from "./ai";
import {
  canonicalGithubUrl,
  fetchGithubMetadata,
  parseGithubUrl,
  type GithubMetadata,
} from "./github";
import { extractGithubFromX, parseXUrl } from "./x";
import { extractGithubFromYoutube, parseYoutubeUrl } from "./youtube";
import { slugifyRepo } from "./format";
import { finishSyncLog, startSyncLog } from "./sync-log";
import { clearProjectUseCases, syncProjectUseCases } from "./use-cases";
import { upsertTodayRecommendation } from "./today-recommendation";

export type CuratedAnalysis = {
  projectType: string;
  category: Category;
  tags: string[];
  frameworks: string[];
  models: string[];
  useCases: string[];
  summary: string;
  inScope?: boolean;
};

export const OUT_OF_CATALOG_NOTE =
  "Out of catalog: not an AI/Agent/MCP/RAG/Skills/Framework project.";

export const AI_ANALYSIS_FAILED_NOTE =
  "AI analysis failed. The project is in draft until an editor reviews it.";

export type AnalysisSource = "ai" | "curated" | "heuristic" | "fallback-after-error";

export function isTrustedAnalysis(source: AnalysisSource) {
  return source === "ai" || source === "curated";
}

function metadataFromParsed(owner: string, repo: string, fallback?: Partial<GithubMetadata>): GithubMetadata {
  return {
    githubUrl: canonicalGithubUrl(owner, repo),
    owner,
    repoName: repo,
    slug: slugifyRepo(owner, repo),
    description: fallback?.description ?? null,
    stars: fallback?.stars ?? 0,
    forks: fallback?.forks ?? 0,
    language: fallback?.language ?? null,
    license: fallback?.license ?? null,
    topics: fallback?.topics ?? [],
    readmeExcerpt: fallback?.readmeExcerpt ?? null,
    fileTree: fallback?.fileTree ?? [],
    dependencies: fallback?.dependencies ?? {},
    lastCommitAt: fallback?.lastCommitAt ?? null,
    githubCreatedAt: fallback?.githubCreatedAt ?? null,
    githubUpdatedAt: fallback?.githubUpdatedAt ?? null,
    defaultBranch: fallback?.defaultBranch ?? "main",
  };
}

export async function upsertProjectFromGithub(options: {
  githubUrl: string;
  fallback?: Partial<GithubMetadata>;
  preferLive?: boolean;
}) {
  const parsed = parseGithubUrl(options.githubUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub repository URL");
  }

  let meta = metadataFromParsed(parsed.owner, parsed.repo, options.fallback);
  const log = await startSyncLog("github_fetch", `${parsed.owner}/${parsed.repo}`);

  try {
    if (options.preferLive !== false && (process.env.GITHUB_TOKEN || options.preferLive)) {
      try {
        meta = await fetchGithubMetadata(parsed.owner, parsed.repo);
      } catch (error) {
        if (!options.fallback) throw error;
      }
    }
    await finishSyncLog(log.id, SyncStatus.success, {
      payload: { stars: meta.stars, license: meta.license },
    });
  } catch (error) {
    await finishSyncLog(log.id, SyncStatus.failed, {
      error: error instanceof Error ? error.message : "GitHub fetch failed",
    });
    throw error;
  }

  const project = await prisma.project.upsert({
    where: { githubUrl: meta.githubUrl },
    create: {
      githubUrl: meta.githubUrl,
      owner: meta.owner,
      repoName: meta.repoName,
      slug: meta.slug,
      description: meta.description,
      stars: meta.stars,
      forks: meta.forks,
      language: meta.language,
      license: meta.license,
      topics: meta.topics,
      readmeExcerpt: meta.readmeExcerpt,
      lastCommitAt: meta.lastCommitAt,
      githubCreatedAt: meta.githubCreatedAt,
      githubUpdatedAt: meta.githubUpdatedAt,
      status: ProjectStatus.draft,
    },
    update: {
      owner: meta.owner,
      repoName: meta.repoName,
      description: meta.description,
      stars: meta.stars,
      forks: meta.forks,
      language: meta.language,
      license: meta.license,
      topics: meta.topics,
      readmeExcerpt: meta.readmeExcerpt,
      lastCommitAt: meta.lastCommitAt,
      githubCreatedAt: meta.githubCreatedAt,
      githubUpdatedAt: meta.githubUpdatedAt,
    },
  });

  return { project, meta };
}

export async function saveAnalysis(projectId: string, analysis: StructuredAnalysis | CuratedAnalysis) {
  const structured: StructuredAnalysis =
    "summary" in analysis && "use_cases" in (analysis as StructuredAnalysis)
      ? (analysis as StructuredAnalysis)
      : {
          project_type: (analysis as CuratedAnalysis).projectType,
          category: (analysis as CuratedAnalysis).category,
          tags: (analysis as CuratedAnalysis).tags,
          frameworks: (analysis as CuratedAnalysis).frameworks,
          models: (analysis as CuratedAnalysis).models,
          capabilities: [],
          use_cases: (analysis as CuratedAnalysis).useCases,
          summary: (analysis as CuratedAnalysis).summary,
          in_scope: (analysis as CuratedAnalysis).inScope !== false,
        };

  const data = {
    projectType: structured.project_type,
    category: structured.category,
    tags: structured.tags,
    frameworks: structured.frameworks,
    models: structured.models,
    capabilities: [],
    useCases: structured.use_cases,
    aiSummary: structured.summary,
    inScope: structured.in_scope,
    analyzedAt: new Date(),
    analysisVersion: 1,
  };

  return prisma.projectAnalysis.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });
}

export function heuristicAnalysis(meta: GithubMetadata): CuratedAnalysis {
  const blob = `${meta.repoName} ${meta.description || ""} ${meta.topics.join(" ")}`.toLowerCase();
  const inScope =
    /\b(ai|llm|gpt|agent|mcp|rag|embedding|transformer|langchain|openai|claude|copilot|ollama|comfy|vibe.?cod|inference)\b/i.test(
      blob,
    );
  let category: Category = "AI_TOOLS";
  if (blob.includes("mcp") || blob.includes("model-context-protocol")) category = "MCP";
  else if (blob.includes("rag") || blob.includes("retriev") || blob.includes("vector")) category = "RAG";
  else if (blob.includes("skill")) category = "SKILLS";
  else if (blob.includes("coding") || blob.includes("copilot") || blob.includes("aider")) category = "AI_CODING";
  else if (blob.includes("agent")) category = "AI_AGENTS";
  else if (blob.includes("framework") || blob.includes("langchain") || blob.includes("sdk")) category = "AI_FRAMEWORKS";

  const tags = [meta.language, ...meta.topics.slice(0, 4)].filter((item): item is string => Boolean(item)).slice(0, 6);
  return {
    projectType: inScope ? category.toLowerCase() : "other",
    category,
    tags: tags.length ? tags : [meta.repoName],
    frameworks: [],
    models: [],
    useCases: inScope ? ["Explore on GitHub", "Vibe coding"] : ["General software"],
    summary: (meta.description || `${meta.owner}/${meta.repoName} is an open source project on GitHub.`).slice(0, 240),
    inScope,
  };
}

export async function runAiAnalysis(
  meta: GithubMetadata,
  fallback?: CuratedAnalysis,
  options?: { skipAi?: boolean },
): Promise<{ analysis: StructuredAnalysis | CuratedAnalysis; source: AnalysisSource; error?: string }> {
  const log = await startSyncLog("ai_analysis", meta.githubUrl);
  const resolvedFallback = fallback ?? heuristicAnalysis(meta);
  try {
    if (options?.skipAi && fallback) {
      await finishSyncLog(log.id, SyncStatus.success, { payload: { source: "curated" } });
      return { analysis: fallback, source: "curated" };
    }
    if (hasAiConfigured()) {
      const analysis = await analyzeProject(meta);
      await finishSyncLog(log.id, SyncStatus.success, { payload: { source: "ai" } });
      return { analysis, source: "ai" };
    }
    await finishSyncLog(log.id, SyncStatus.failed, {
      payload: { source: "heuristic" },
      error: "AI is not configured.",
    });
    return { analysis: resolvedFallback, source: "heuristic", error: "AI is not configured." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI analysis failed";
    await finishSyncLog(log.id, SyncStatus.failed, {
      payload: { source: "fallback-after-error" },
      error: message,
    });
    return { analysis: resolvedFallback, source: "fallback-after-error", error: message };
  }
}

export async function ingestGithubProject(options: {
  githubUrl: string;
  fallbackMeta?: Partial<GithubMetadata>;
  fallbackAnalysis?: CuratedAnalysis;
  publish?: boolean;
  preferLive?: boolean;
  skipAi?: boolean;
  minStarsForPublish?: number;
}) {
  const { project, meta } = await upsertProjectFromGithub({
    githubUrl: options.githubUrl,
    fallback: options.fallbackMeta,
    preferLive: options.preferLive,
  });

  const { analysis, source, error } = await runAiAnalysis(meta, options.fallbackAnalysis, { skipAi: options.skipAi });
  await saveAnalysis(project.id, analysis);

  const refreshed = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
  const inScope = isInScope(analysis);
  const minStars = options.minStarsForPublish ?? 0;
  const canAutoPublish =
    Boolean(options.publish) &&
    isTrustedAnalysis(source) &&
    inScope &&
    refreshed.stars >= minStars;

  if (!isTrustedAnalysis(source)) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.draft },
    });
    await clearProjectUseCases(project.id);
  } else if (options.publish) {
    const nextStatus = canAutoPublish ? ProjectStatus.published : ProjectStatus.draft;
    await prisma.project.update({
      where: { id: project.id },
      data: { status: nextStatus },
    });
    if (nextStatus === ProjectStatus.published) {
      await syncProjectUseCases(project.id);
    } else {
      await clearProjectUseCases(project.id);
    }
  } else {
    const current = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    if (current.status === ProjectStatus.published) {
      await syncProjectUseCases(project.id);
    }
  }

  return {
    project: await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: { analysis: true },
    }),
    analysisSource: source,
    analysisError: error,
  };
}

/**
 * Re-run AI analysis for an already-published project.
 * Always keeps status=published and rebuilds use-case links from the new analysis.
 */
export async function reanalyzePublishedProject(projectId: string) {
  const existing = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  if (existing.status !== ProjectStatus.published) {
    return {
      ok: false as const,
      label: `${existing.owner}/${existing.repoName}`,
      error: `skipped: status is ${existing.status}`,
    };
  }

  const { project, meta } = await upsertProjectFromGithub({
    githubUrl: existing.githubUrl,
    preferLive: true,
  });

  const { analysis, source, error } = await runAiAnalysis(meta);
  await saveAnalysis(project.id, analysis);

  await prisma.project.update({
    where: { id: project.id },
    data: { status: ProjectStatus.published },
  });

  await clearProjectUseCases(project.id);
  await syncProjectUseCases(project.id);

  return {
    ok: isTrustedAnalysis(source),
    label: `${project.owner}/${project.repoName}`,
    source,
    error,
  };
}

function isInScope(analysis: StructuredAnalysis | CuratedAnalysis | { inScope?: boolean; in_scope?: boolean } | null | undefined) {
  if (!analysis) return false;
  if ("in_scope" in analysis && typeof analysis.in_scope === "boolean") return analysis.in_scope;
  if ("inScope" in analysis && typeof analysis.inScope === "boolean") return analysis.inScope;
  return true;
}

export type ProcessResult = {
  slug?: string;
  slugs?: string[];
  newlyPublishedSlugs?: string[];
  alreadyPublishedSlugs?: string[];
  published: boolean;
  alreadyPublished?: boolean;
  found?: number;
  publishedCount?: number;
  newlyPublishedCount?: number;
  alreadyPublishedCount?: number;
  reviewCount?: number;
  message: string;
};

function publishedSlugsOf(item: ProcessResult) {
  return item.slugs?.length ? item.slugs : item.slug ? [item.slug] : [];
}

function formatRepoOutcomeMessage(
  found: number,
  newlyCount: number,
  alreadyCount: number,
  reviewCount: number,
) {
  const foundLabel = found === 1 ? "repository" : "repositories";
  if (reviewCount === 0 && newlyCount > 0 && alreadyCount === 0) {
    return `Found ${found} ${foundLabel}. All newly published.`;
  }
  if (reviewCount === 0 && alreadyCount > 0 && newlyCount === 0) {
    return `Found ${found} ${foundLabel}. All already on the site.`;
  }
  const parts: string[] = [];
  if (newlyCount > 0) parts.push(`${newlyCount} newly published`);
  if (alreadyCount > 0) parts.push(`${alreadyCount} already on the site`);
  if (reviewCount > 0) parts.push(`${reviewCount} waiting for admin review`);
  return `Found ${found} ${foundLabel}. ${parts.join(", ")}.`;
}

const MAX_REPOS_PER_POST = 20;
const SUBMIT_MIN_STARS = 100;

async function findExistingProject(githubUrl: string) {
  const canonical = canonicalGithubUrlFromRaw(githubUrl);
  const parsed = parseGithubUrl(githubUrl);
  const byUrl = await prisma.project.findUnique({ where: { githubUrl: canonical } });
  if (byUrl) return byUrl;
  if (!parsed) return null;
  return prisma.project.findUnique({ where: { slug: slugifyRepo(parsed.owner, parsed.repo) } });
}

async function alreadyPublishedResult(
  submissionId: string,
  project: { id: string; slug: string; githubUrl: string },
): Promise<ProcessResult> {
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.published,
      projectId: project.id,
      githubUrl: project.githubUrl,
      reviewedAt: new Date(),
      notes: "Already published.",
    },
  });
  const { maybeGrantSubmissionReward } = await import("./submission-reward");
  await maybeGrantSubmissionReward(submissionId);
  return {
    slug: project.slug,
    slugs: [project.slug],
    alreadyPublishedSlugs: [project.slug],
    published: true,
    alreadyPublished: true,
    publishedCount: 1,
    newlyPublishedCount: 0,
    alreadyPublishedCount: 1,
    reviewCount: 0,
    found: 1,
    message: "This project is already published.",
  };
}

async function ingestKnownGithub(submissionId: string, githubUrl: string): Promise<ProcessResult> {
  const existing = await findExistingProject(githubUrl);
  if (existing?.status === ProjectStatus.published) {
    return alreadyPublishedResult(submissionId, existing);
  }

  const { project, analysisSource, analysisError } = await ingestGithubProject({ githubUrl, preferLive: true });
  if (project.status === ProjectStatus.published) {
    return alreadyPublishedResult(submissionId, project);
  }
  const noLicense = !project.license;
  const inScope = project.analysis?.inScope ?? true;

  if (!isTrustedAnalysis(analysisSource)) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.draft },
    });
    await clearProjectUseCases(project.id);
    const notes = analysisError ? `${AI_ANALYSIS_FAILED_NOTE} ${analysisError}` : AI_ANALYSIS_FAILED_NOTE;
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.needs_review,
        projectId: project.id,
        githubUrl: project.githubUrl,
        notes,
      },
    });
    return {
      slug: project.slug,
      slugs: [project.slug],
      published: false,
      publishedCount: 0,
      reviewCount: 1,
      found: 1,
      message: notes,
    };
  }

  if (!inScope) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.draft },
    });
    await clearProjectUseCases(project.id);
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.needs_review,
        projectId: project.id,
        githubUrl: project.githubUrl,
        notes: noLicense ? `${OUT_OF_CATALOG_NOTE} Also no license.` : OUT_OF_CATALOG_NOTE,
      },
    });
    return {
      slug: project.slug,
      slugs: [project.slug],
      published: false,
      publishedCount: 0,
      reviewCount: 1,
      found: 1,
      message: OUT_OF_CATALOG_NOTE,
    };
  }

  if (project.stars < SUBMIT_MIN_STARS) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.draft },
    });
    await clearProjectUseCases(project.id);
    const notes = `Needs at least ${SUBMIT_MIN_STARS} GitHub stars to auto-publish (currently ${project.stars}).`;
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.needs_review,
        projectId: project.id,
        githubUrl: project.githubUrl,
        notes,
      },
    });
    return {
      slug: project.slug,
      slugs: [project.slug],
      published: false,
      publishedCount: 0,
      reviewCount: 1,
      found: 1,
      message: `Analyzed, but it needs at least ${SUBMIT_MIN_STARS} stars to publish automatically. It is waiting for admin review.`,
    };
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { status: ProjectStatus.published },
  });
  await syncProjectUseCases(project.id);
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.published,
      projectId: project.id,
      githubUrl: project.githubUrl,
      reviewedAt: new Date(),
    },
  });
  await upsertTodayRecommendation({
    projectId: project.id,
    projectName: `${project.owner}/${project.repoName}`,
    stars: project.stars,
    source: "submit",
    status: ProjectStatus.published,
    newlyPublished: true,
    projectCreatedAt: project.createdAt,
  });
  const { maybeGrantSubmissionReward } = await import("./submission-reward");
  await maybeGrantSubmissionReward(submissionId);
  return {
    slug: project.slug,
    slugs: [project.slug],
    newlyPublishedSlugs: [project.slug],
    published: true,
    alreadyPublished: false,
    publishedCount: 1,
    newlyPublishedCount: 1,
    alreadyPublishedCount: 0,
    reviewCount: 0,
    found: 1,
    message: "Analyzed and published.",
  };
}

async function processMultiGithubSource(
  submissionId: string,
  sourceType: "x" | "youtube",
  sourceUrl: string,
  submitterEmail: string | null,
  githubUrls: string[],
  submitterIp: string | null,
): Promise<ProcessResult> {
  const results: ProcessResult[] = [];
  for (const githubUrl of githubUrls) {
    let child = await prisma.submission.findFirst({
      where: { sourceUrl, githubUrl, NOT: { id: submissionId } },
      orderBy: { submittedAt: "desc" },
    });
    if (!child) {
      child = await prisma.submission.create({
        data: {
          sourceType,
          sourceUrl,
          githubUrl,
          submitterEmail,
          submitterIp,
          status: SubmissionStatus.pending,
        },
      });
    } else if (submitterIp && child.submitterIp !== submitterIp) {
      child = await prisma.submission.update({
        where: { id: child.id },
        data: { submitterIp },
      });
    }
    if (child.id === submissionId) {
      results.push(await ingestKnownGithub(child.id, githubUrl));
      continue;
    }
    results.push(await processSubmission(child.id));
  }

  const newlyPublishedSlugs = results.flatMap((item) =>
    item.published && !item.alreadyPublished ? publishedSlugsOf(item) : [],
  );
  const alreadyPublishedSlugs = results.flatMap((item) =>
    item.alreadyPublished ? publishedSlugsOf(item) : [],
  );
  const slugs = [...newlyPublishedSlugs, ...alreadyPublishedSlugs];
  const newlyPublishedCount = newlyPublishedSlugs.length;
  const alreadyPublishedCount = alreadyPublishedSlugs.length;
  const publishedCount = newlyPublishedCount + alreadyPublishedCount;
  const reviewCount = results.length - publishedCount;
  const message = formatRepoOutcomeMessage(
    githubUrls.length,
    newlyPublishedCount,
    alreadyPublishedCount,
    reviewCount,
  );
  const notes = [`Found ${githubUrls.length} GitHub repositories.`, ...githubUrls, message].join("\n");

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: publishedCount > 0 && reviewCount === 0 ? SubmissionStatus.published : SubmissionStatus.needs_review,
      githubUrl: null,
      reviewedAt: new Date(),
      notes,
    },
  });

  return {
    slug: slugs[0],
    slugs,
    newlyPublishedSlugs,
    alreadyPublishedSlugs,
    published: publishedCount > 0,
    found: githubUrls.length,
    publishedCount,
    newlyPublishedCount,
    alreadyPublishedCount,
    reviewCount,
    message,
  };
}

export async function processSubmission(submissionId: string): Promise<ProcessResult> {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    return { published: false, message: "Submission not found." };
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: SubmissionStatus.analyzing },
  });

  try {
    let githubUrl = submission.githubUrl;

    if ((submission.sourceType === "x" || submission.sourceType === "youtube") && !githubUrl) {
      const extracted =
        submission.sourceType === "youtube"
          ? await extractGithubFromYoutube(submission.sourceUrl)
          : await extractGithubFromX(submission.sourceUrl);
      const githubUrls = extracted.githubUrls.slice(0, MAX_REPOS_PER_POST);
      const sourceLabel = submission.sourceType === "youtube" ? "YouTube video description" : "X post";
      if (githubUrls.length === 0) {
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: SubmissionStatus.needs_review,
            notes: `Could not extract a GitHub URL from the ${sourceLabel}. Paste the repository URL to continue.`,
          },
        });
        return {
          published: false,
          message: `We could not find a GitHub URL in that ${sourceLabel}. An editor will review it, or submit the repository URL directly.`,
        };
      }
      return processMultiGithubSource(
        submission.id,
        submission.sourceType,
        submission.sourceUrl,
        submission.submitterEmail,
        githubUrls,
        submission.submitterIp,
      );
    }

    if (!githubUrl) {
      throw new Error("Missing GitHub URL");
    }

    return ingestKnownGithub(submissionId, githubUrl);
  } catch (error) {
    const notes = error instanceof Error ? error.message : "Processing failed";
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.needs_review,
        notes,
      },
    });
    return { published: false, message: notes };
  }
}

function canonicalGithubUrlFromRaw(raw: string) {
  const parsed = parseGithubUrl(raw);
  if (!parsed) return raw.replace(/\.git$/, "").replace(/\/$/, "");
  return canonicalGithubUrl(parsed.owner, parsed.repo);
}

export async function createSubmission(input: {
  sourceType: "github" | "x" | "youtube";
  sourceUrl: string;
  submitterEmail?: string;
  submitterIp?: string;
}) {
  const sourceUrl = input.sourceUrl.trim();
  const submitterIp = input.submitterIp?.trim() || null;
  if (input.sourceType === "github") {
    const parsed = parseGithubUrl(sourceUrl);
    if (!parsed) {
      throw new Error("Enter a valid GitHub repository URL, like https://github.com/owner/repo");
    }
    const githubUrl = canonicalGithubUrl(parsed.owner, parsed.repo);
    const existingPublished = await findExistingProject(githubUrl);
    if (existingPublished?.status === ProjectStatus.published) {
      return { alreadyPublished: true as const, slug: existingPublished.slug };
    }
    const open = await prisma.submission.findFirst({
      where: {
        githubUrl,
        status: { in: [SubmissionStatus.pending, SubmissionStatus.analyzing, SubmissionStatus.needs_review] },
      },
      orderBy: { submittedAt: "desc" },
    });
    if (open) {
      return { alreadyPublished: false as const, submissionId: open.id };
    }
    const submission = await prisma.submission.create({
      data: {
        sourceType: "github",
        sourceUrl: githubUrl,
        githubUrl,
        submitterEmail: input.submitterEmail || null,
        submitterIp,
        status: SubmissionStatus.pending,
      },
    });
    return { alreadyPublished: false as const, submissionId: submission.id };
  }

  if (input.sourceType === "youtube") {
    const parsed = parseYoutubeUrl(sourceUrl);
    if (!parsed) {
      throw new Error("Enter a valid YouTube video URL");
    }
    const submission = await prisma.submission.create({
      data: {
        sourceType: "youtube",
        sourceUrl: parsed.url,
        submitterEmail: input.submitterEmail || null,
        submitterIp,
        status: SubmissionStatus.pending,
      },
    });
    return { alreadyPublished: false as const, submissionId: submission.id };
  }

  if (!parseXUrl(sourceUrl)) {
    throw new Error("Enter a valid X/Twitter post URL");
  }
  const submission = await prisma.submission.create({
    data: {
      sourceType: "x",
      sourceUrl,
      submitterEmail: input.submitterEmail || null,
      submitterIp,
      status: SubmissionStatus.pending,
    },
  });
  return { alreadyPublished: false as const, submissionId: submission.id };
}

export async function processPendingSubmissions(limit = 5) {
  const pending = await prisma.submission.findMany({
    where: { status: SubmissionStatus.pending },
    orderBy: { submittedAt: "asc" },
    take: limit,
  });
  for (const item of pending) {
    await processSubmission(item.id);
  }
  return pending.length;
}

export async function refreshPublishedStars(limit = 25) {
  const projects = await prisma.project.findMany({
    where: { status: ProjectStatus.published },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });
  for (const project of projects) {
    const log = await startSyncLog("star_refresh", project.githubUrl);
    try {
      const parsed = parseGithubUrl(project.githubUrl);
      if (!parsed) continue;
      const meta = await fetchGithubMetadata(parsed.owner, parsed.repo);
      await prisma.project.update({
        where: { id: project.id },
        data: {
          stars: meta.stars,
          forks: meta.forks,
          language: meta.language,
          license: meta.license,
          topics: meta.topics,
          lastCommitAt: meta.lastCommitAt,
          githubUpdatedAt: meta.githubUpdatedAt,
        },
      });
      await finishSyncLog(log.id, SyncStatus.success, { payload: { stars: meta.stars } });
    } catch (error) {
      await finishSyncLog(log.id, SyncStatus.failed, {
        error: error instanceof Error ? error.message : "Star refresh failed",
      });
    }
  }
}
