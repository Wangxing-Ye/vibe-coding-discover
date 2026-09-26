import { sanitizeForDb, slugifyRepo } from "./format";
import { formatNetworkError, withRetries } from "./network";

export type GithubRepoInput = {
  owner: string;
  repo: string;
};

export type GithubMetadata = {
  githubUrl: string;
  owner: string;
  repoName: string;
  slug: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  license: string | null;
  topics: string[];
  readmeExcerpt: string | null;
  fileTree: string[];
  dependencies: Record<string, string>;
  lastCommitAt: Date | null;
  githubCreatedAt: Date | null;
  githubUpdatedAt: Date | null;
  defaultBranch: string;
};

const GITHUB_OWNER_REPO_RE = /^[A-Za-z0-9_.-]+$/;
const GITHUB_RESERVED = new Set([
  "about",
  "explore",
  "features",
  "login",
  "marketplace",
  "notifications",
  "orgs",
  "pricing",
  "settings",
  "sponsors",
  "topics",
  "users",
]);

export function parseGithubUrl(raw: string): GithubRepoInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;

    const [owner, repoRaw] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repoRaw) return null;
    if (GITHUB_RESERVED.has(owner.toLowerCase())) return null;

    const repo = repoRaw.replace(/\.git$/i, "");
    if (!GITHUB_OWNER_REPO_RE.test(owner) || !GITHUB_OWNER_REPO_RE.test(repo)) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

export function canonicalGithubUrl(owner: string, repo: string) {
  return `https://github.com/${owner}/${repo}`;
}

async function githubFetch<T>(path: string, accept?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: accept || "application/vnd.github+json",
    "User-Agent": "VibeCodingDiscover/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    return await withRetries(`GitHub ${path}`, async () => {
      const res = await fetch(`https://api.github.com${path}`, { headers });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`GitHub API ${res.status} ${path}: ${body.slice(0, 200)}`);
      }
      return res.json() as Promise<T>;
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("GitHub API ")) throw error;
    throw new Error(formatNetworkError(error, "api.github.com"));
  }
}

type GithubLicense = {
  key?: string | null;
  spdx_id?: string | null;
  name?: string | null;
};

type RepoResponse = {
  html_url: string;
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  license: GithubLicense | null;
  topics?: string[];
  pushed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  default_branch: string;
  owner: { login: string };
};

export type GithubSearchHit = {
  githubUrl: string;
  owner: string;
  repoName: string;
  stars: number;
  license: string | null;
  description: string | null;
};

/**
 * Map GitHub license metadata:
 * - SPDX id → that id (e.g. MIT)
 * - present but non-SPDX (NOASSERTION / other) → "Custom"
 * - missing → null (no license)
 */
export function normalizeLicense(license: GithubLicense | null | undefined): string | null {
  if (!license) return null;
  const spdx = license.spdx_id?.trim();
  if (spdx && spdx !== "NOASSERTION") return spdx;
  return "Custom";
}

export async function searchGithubRepositories(options: {
  query: string;
  perPage?: number;
  page?: number;
  sort?: "stars" | "updated" | "best-match";
}): Promise<GithubSearchHit[]> {
  const perPage = Math.min(options.perPage ?? 20, 30);
  const page = options.page ?? 1;
  const sort = options.sort && options.sort !== "best-match" ? `&sort=${options.sort}&order=desc` : "";
  const path =
    `/search/repositories?q=${encodeURIComponent(options.query)}&per_page=${perPage}&page=${page}${sort}`;
  const data = await githubFetch<{ items?: RepoResponse[] }>(path);
  return (data.items ?? []).map((item) => ({
    githubUrl: item.html_url.replace(/\.git$/, ""),
    owner: item.owner.login,
    repoName: item.name,
    stars: item.stargazers_count,
    license: normalizeLicense(item.license),
    description: item.description,
  }));
}

/** Lightweight repo lookup for discovery prefilters (no README/tree). */
export async function fetchGithubRepoLite(owner: string, repo: string): Promise<GithubSearchHit> {
  const data = await githubFetch<RepoResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  );
  return {
    githubUrl: data.html_url.replace(/\.git$/, ""),
    owner: data.owner.login,
    repoName: data.name,
    stars: data.stargazers_count,
    license: normalizeLicense(data.license),
    description: data.description,
  };
}

type ContentFile = {
  type: string;
  content?: string;
  encoding?: string;
};

type TreeResponse = {
  tree: { path?: string; type?: string }[];
};

async function decodeContent(owner: string, repo: string, path: string) {
  try {
    const data = await githubFetch<ContentFile | ContentFile[]>(
      `/repos/${owner}/${repo}/contents/${path}`,
    );
    if (Array.isArray(data) || data.type !== "file" || !data.content) return null;
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export async function fetchGithubMetadata(owner: string, repo: string): Promise<GithubMetadata> {
  const data = await githubFetch<RepoResponse>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);

  let readmeExcerpt: string | null = null;
  try {
    const readme = await githubFetch<ContentFile>(
      `/repos/${owner}/${repo}/readme`,
    );
    if (readme.content) {
      readmeExcerpt = sanitizeForDb(Buffer.from(readme.content, "base64").toString("utf8").slice(0, 12000));
    }
  } catch {
    readmeExcerpt = null;
  }

  const fileTree: string[] = [];
  try {
    const tree = await githubFetch<TreeResponse>(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(data.default_branch)}?recursive=1`,
    );
    for (const item of tree.tree) {
      if (!item.path || item.type !== "blob") continue;
      const depth = item.path.split("/").length;
      if (depth <= 2) fileTree.push(item.path);
      if (fileTree.length >= 180) break;
    }
  } catch {
    // Tree fetch is optional.
  }

  const dependencyFiles = [
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "go.mod",
    "Cargo.toml",
    "composer.json",
    "Gemfile",
  ];
  const dependencies: Record<string, string> = {};
  for (const path of dependencyFiles) {
    const content = await decodeContent(owner, repo, path);
    if (content) dependencies[path] = sanitizeForDb(content.slice(0, 4000));
  }

  return {
    githubUrl: data.html_url.replace(/\.git$/, ""),
    owner: data.owner.login,
    repoName: data.name,
    slug: slugifyRepo(data.owner.login, data.name),
    description: sanitizeForDb(data.description),
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language,
    license: normalizeLicense(data.license),
    topics: (data.topics ?? []).map((topic) => sanitizeForDb(topic)),
    readmeExcerpt,
    fileTree,
    dependencies,
    lastCommitAt: data.pushed_at ? new Date(data.pushed_at) : null,
    githubCreatedAt: data.created_at ? new Date(data.created_at) : null,
    githubUpdatedAt: data.updated_at ? new Date(data.updated_at) : null,
    defaultBranch: data.default_branch,
  };
}
