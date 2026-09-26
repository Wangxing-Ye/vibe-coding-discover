import { SyncStatus } from "@prisma/client";
import { prisma } from "./db";
import {
  fetchGithubRepoLite,
  parseGithubUrl,
  searchGithubRepositories,
  type GithubSearchHit,
} from "./github";
import { fetchGithubTrendingRepos } from "./github-trending";
import { formatNetworkError, isTransientNetworkError, serializeError } from "./network";
import { ingestGithubProject } from "./pipeline";
import { finishSyncLog, startSyncLog } from "./sync-log";
import { upsertTodayRecommendation } from "./today-recommendation";
import { hasXBearer, searchRecentTweetsWithGithub } from "./x";
import { watchlistXQuery } from "./x-watchlist";

export type DiscoverSource = "github" | "x" | "trending" | "watchlist";

export type DiscoverStats = {
  githubCandidates: number;
  xCandidates: number;
  trendingCandidates: number;
  watchlistCandidates: number;
  watchlistAccounts: number;
  skippedExisting: number;
  skippedFilter: number;
  ingested: number;
  published: number;
  drafted: number;
  recommended: number;
  errors: string[];
};

function envBool(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function envInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function isDiscoverEnabled() {
  return envBool("DISCOVER_ENABLED", true);
}

export function discoverMinStars() {
  return envInt("DISCOVER_MIN_STARS", 100);
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function githubQueries(minStars: number) {
  const pushed = daysAgoIso(30);
  return [
    `stars:>=${minStars} pushed:>${pushed} topic:mcp`,
    `stars:>=${minStars} pushed:>${pushed} topic:langchain`,
    `stars:>=${minStars} pushed:>${pushed} topic:rag`,
    `stars:>=${minStars} pushed:>${pushed} topic:llm`,
    `stars:>=${minStars} pushed:>${pushed} topic:ai-agents`,
    `stars:>=${minStars} pushed:>${pushed} "model context protocol"`,
    `stars:>=${minStars} pushed:>${pushed} "coding agent"`,
    `stars:>=${minStars} pushed:>${pushed} "vibe coding"`,
  ];
}

function xQueries() {
  return [
    '(github.com) (mcp OR "model context protocol" OR langchain OR ollama OR "coding agent" OR rag OR "ai agent") -is:retweet lang:en',
  ];
}

async function findTracked(githubUrl: string) {
  return prisma.project.findUnique({
    where: { githubUrl },
    select: { id: true, owner: true, repoName: true, stars: true, status: true, createdAt: true },
  });
}

async function collectGithubHits(minStars: number, limit: number): Promise<GithubSearchHit[]> {
  if (!process.env.GITHUB_TOKEN) return [];

  const seen = new Set<string>();
  const hits: GithubSearchHit[] = [];

  for (const query of githubQueries(minStars)) {
    if (hits.length >= limit) break;
    try {
      const page = await searchGithubRepositories({
        query,
        perPage: Math.min(20, limit - hits.length),
        sort: "updated",
      });
      for (const hit of page) {
        if (seen.has(hit.githubUrl)) continue;
        seen.add(hit.githubUrl);
        hits.push(hit);
        if (hits.length >= limit) break;
      }
    } catch (error) {
      const message = serializeError(error);
      console.error(`GitHub discover query failed (${query}): ${message}`);
      if (isTransientNetworkError(error)) {
        throw new Error(formatNetworkError(error, "api.github.com"));
      }
    }
  }

  return hits;
}

async function collectXGithubUrls(limit: number) {
  if (!hasXBearer()) return [] as { githubUrl: string; sourceUrl: string }[];

  const seen = new Set<string>();
  const urls: { githubUrl: string; sourceUrl: string }[] = [];

  for (const query of xQueries()) {
    if (urls.length >= limit) break;
    try {
      const tweets = await searchRecentTweetsWithGithub({
        query,
        maxResults: Math.min(50, Math.max(10, limit)),
      });
      for (const tweet of tweets) {
        for (const githubUrl of tweet.githubUrls.slice(0, 5)) {
          if (seen.has(githubUrl)) continue;
          seen.add(githubUrl);
          urls.push({ githubUrl, sourceUrl: tweet.tweetUrl });
          if (urls.length >= limit) break;
        }
        if (urls.length >= limit) break;
      }
    } catch (error) {
      const message = serializeError(error);
      console.error(`X discover query failed (${query}): ${message}`);
      if (isTransientNetworkError(error)) {
        throw new Error(formatNetworkError(error, "api.x.com"));
      }
      throw error;
    }
  }

  return urls;
}

async function passesDiscoveryGates(githubUrl: string, minStars: number, known?: GithubSearchHit) {
  if (known) {
    if (known.stars < minStars) return false;
  }

  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) return false;

  const lite = await fetchGithubRepoLite(parsed.owner, parsed.repo);
  return lite.stars >= minStars;
}

async function recommendIfEligible(options: {
  projectId: string;
  owner: string;
  repoName: string;
  stars: number;
  status: string;
  source: DiscoverSource;
  stats: DiscoverStats;
  todayStars?: number;
  projectCreatedAt?: Date | null;
  newlyPublished?: boolean;
}) {
  const ok = await upsertTodayRecommendation({
    projectId: options.projectId,
    projectName: `${options.owner}/${options.repoName}`,
    stars: options.stars,
    source: options.source,
    status: options.status,
    todayStars: options.todayStars ?? 0,
    projectCreatedAt: options.projectCreatedAt,
    newlyPublished: options.newlyPublished,
  });
  if (ok) options.stats.recommended += 1;
}

async function ingestDiscoveredRepo(options: {
  githubUrl: string;
  sourceType: DiscoverSource;
  sourceUrl: string;
  minStars: number;
  stats: DiscoverStats;
  known?: GithubSearchHit;
  todayStars?: number;
}) {
  const { githubUrl, sourceType, sourceUrl, minStars, stats, known, todayStars = 0 } = options;
  const submissionSourceType = sourceType === "watchlist" ? "x" : sourceType;

  const existing = await findTracked(githubUrl);
  if (existing) {
    stats.skippedExisting += 1;
    // Only trending re-hits of already-tracked repos go into Today's Recommendations.
    if (sourceType === "trending") {
      await recommendIfEligible({
        projectId: existing.id,
        owner: existing.owner,
        repoName: existing.repoName,
        stars: existing.stars,
        status: existing.status,
        source: sourceType,
        stats,
        todayStars,
      });
    }
    return;
  }

  try {
    if (!(await passesDiscoveryGates(githubUrl, minStars, known))) {
      stats.skippedFilter += 1;
      return;
    }

    if (await findTracked(githubUrl)) {
      stats.skippedExisting += 1;
      return;
    }

    const { project } = await ingestGithubProject({
      githubUrl,
      preferLive: true,
      publish: true,
      minStarsForPublish: minStars,
    });

    // Low-star after live ingest: discard (do not keep as draft). No-license repos stay, like Submit.
    if (project.stars < minStars) {
      await prisma.project.delete({ where: { id: project.id } });
      stats.skippedFilter += 1;
      return;
    }

    stats.ingested += 1;
    if (project.status === "published") stats.published += 1;
    else stats.drafted += 1;

    await recommendIfEligible({
      projectId: project.id,
      owner: project.owner,
      repoName: project.repoName,
      stars: project.stars,
      status: project.status,
      source: sourceType,
      stats,
      todayStars,
      projectCreatedAt: project.createdAt,
    });

    await prisma.submission.create({
      data: {
        sourceType: submissionSourceType,
        sourceUrl,
        githubUrl: project.githubUrl,
        projectId: project.id,
        status: project.status === "published" ? "published" : "needs_review",
        notes: `auto-discover:${sourceType}`,
        reviewedAt: project.status === "published" ? new Date() : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stats.errors.push(`${githubUrl}: ${message}`);
  }
}

/**
 * Periodic discovery: GitHub Search, X, Trending, or X watchlist (rotated by the worker).
 * Skip existing projects for ingest (any status) and stars < min.
 * Auto-publish when trusted AI + in_scope + stars gate pass (license optional, same as Submit).
 * Today Recommendation: trending published; or newly published today (not re-discovered old repos).
 */
export async function runDiscovery(source: DiscoverSource = "github"): Promise<DiscoverStats> {
  const stats: DiscoverStats = {
    githubCandidates: 0,
    xCandidates: 0,
    trendingCandidates: 0,
    watchlistCandidates: 0,
    watchlistAccounts: 0,
    skippedExisting: 0,
    skippedFilter: 0,
    ingested: 0,
    published: 0,
    drafted: 0,
    recommended: 0,
    errors: [],
  };

  if (!isDiscoverEnabled()) {
    return stats;
  }

  const minStars = discoverMinStars();
  const githubLimit = envInt("DISCOVER_GITHUB_LIMIT", 30);
  const xLimit = envInt("DISCOVER_X_LIMIT", 20);
  const trendingLimit = envInt("DISCOVER_TRENDING_LIMIT", 25);
  const watchlistPerUser = envInt("DISCOVER_WATCHLIST_PER_USER", 10);
  const watchlistPauseMs = envInt("DISCOVER_WATCHLIST_PAUSE_MS", 5_000);

  const log = await startSyncLog("discover", `periodic:${source}`, {
    source,
    minStars,
    githubLimit,
    xLimit,
    trendingLimit,
    watchlistPerUser,
    watchlistPauseMs,
  });

  try {
    if (source === "github") {
      try {
        const githubHits = await collectGithubHits(minStars, githubLimit);
        stats.githubCandidates = githubHits.length;

        for (const hit of githubHits) {
          await ingestDiscoveredRepo({
            githubUrl: hit.githubUrl,
            sourceType: "github",
            sourceUrl: hit.githubUrl,
            minStars,
            stats,
            known: hit,
          });
        }
      } catch (error) {
        stats.errors.push(error instanceof Error ? error.message : String(error));
      }
    } else if (source === "x") {
      try {
        const xUrls = await collectXGithubUrls(xLimit);
        stats.xCandidates = xUrls.length;

        for (const item of xUrls) {
          await ingestDiscoveredRepo({
            githubUrl: item.githubUrl,
            sourceType: "x",
            sourceUrl: item.sourceUrl,
            minStars,
            stats,
          });
        }
      } catch (error) {
        stats.errors.push(error instanceof Error ? error.message : String(error));
      }
    } else if (source === "trending") {
      try {
        const trendingHits = await fetchGithubTrendingRepos(trendingLimit);
        stats.trendingCandidates = trendingHits.length;

        for (const hit of trendingHits) {
          await ingestDiscoveredRepo({
            githubUrl: hit.githubUrl,
            sourceType: "trending",
            sourceUrl: `https://github.com/trending?since=daily`,
            minStars,
            stats,
            todayStars: hit.todayStars,
          });
        }
      } catch (error) {
        stats.errors.push(error instanceof Error ? error.message : String(error));
      }
    } else if (source === "watchlist") {
      try {
        if (!hasXBearer()) {
          stats.errors.push("X_BEARER_TOKEN is not set");
        } else {
          const accounts = await prisma.xWatchAccount.findMany({
            where: { enabled: true },
            orderBy: [{ lastCheckedAt: "asc" }, { username: "asc" }],
          });
          stats.watchlistAccounts = accounts.length;
          const seenGithub = new Set<string>();

          for (let i = 0; i < accounts.length; i += 1) {
            const account = accounts[i];
            try {
              const tweets = await searchRecentTweetsWithGithub({
                query: watchlistXQuery(account.username),
                maxResults: Math.min(50, Math.max(10, watchlistPerUser)),
              });

              let found = 0;
              for (const tweet of tweets) {
                for (const githubUrl of tweet.githubUrls.slice(0, 5)) {
                  if (seenGithub.has(githubUrl)) continue;
                  seenGithub.add(githubUrl);
                  found += 1;
                  stats.watchlistCandidates += 1;
                  await ingestDiscoveredRepo({
                    githubUrl,
                    sourceType: "watchlist",
                    sourceUrl: tweet.tweetUrl,
                    minStars,
                    stats,
                  });
                  if (found >= watchlistPerUser) break;
                }
                if (found >= watchlistPerUser) break;
              }

              await prisma.xWatchAccount.update({
                where: { id: account.id },
                data: { lastCheckedAt: new Date(), lastError: null },
              });
            } catch (error) {
              const message = serializeError(error);
              stats.errors.push(`@${account.username}: ${message}`);
              await prisma.xWatchAccount.update({
                where: { id: account.id },
                data: { lastCheckedAt: new Date(), lastError: message.slice(0, 500) },
              });
              if (isTransientNetworkError(error)) {
                throw new Error(formatNetworkError(error, "api.x.com"));
              }
            }

            if (i < accounts.length - 1 && watchlistPauseMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, watchlistPauseMs));
            }
          }
        }
      } catch (error) {
        stats.errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    const status = stats.errors.length && stats.ingested === 0 ? SyncStatus.failed : SyncStatus.success;
    await finishSyncLog(log.id, status, {
      error: stats.errors[0],
      payload: { source, ...stats },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stats.errors.push(message);
    await finishSyncLog(log.id, SyncStatus.failed, {
      error: message,
      payload: { source, ...stats },
    });
  }

  return stats;
}

