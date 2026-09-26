import { canonicalGithubUrl, parseGithubUrl } from "./github";
import { formatNetworkError, withRetries } from "./network";

const TRENDING_URL = "https://github.com/trending";
const ARTICLE_RE = /<article[^>]*class="[^"]*Box-row[^"]*"[\s\S]*?<\/article>/gi;
const H2_REPO_HREF_RE = /<h2[^>]*>\s*<a[^>]+href="\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)"/i;
const STARS_TODAY_RE = /([\d,]+)\s*stars?\s*today/i;

export type TrendingHit = {
  githubUrl: string;
  owner: string;
  repo: string;
  /** Stars gained today as shown on the trending page (e.g. "837 stars today"). */
  todayStars: number;
};

function parseStarsToday(articleHtml: string) {
  const match = articleHtml.match(STARS_TODAY_RE);
  if (!match) return 0;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export async function fetchGithubTrendingRepos(limit = 25): Promise<TrendingHit[]> {
  let res: Response;
  try {
    res = await withRetries("GitHub trending", () =>
      fetch(`${TRENDING_URL}?since=daily`, {
        headers: {
          "User-Agent": "VibeCodingDiscover/1.0",
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }),
    );
  } catch (error) {
    throw new Error(formatNetworkError(error, "github.com"));
  }

  if (!res.ok) {
    throw new Error(`GitHub trending ${res.status}`);
  }

  const html = await res.text();
  const seen = new Set<string>();
  const hits: TrendingHit[] = [];

  for (const article of html.matchAll(ARTICLE_RE)) {
    const block = article[0];
    const href = block.match(H2_REPO_HREF_RE);
    if (!href) continue;
    const owner = href[1];
    const repo = href[2];
    const parsed = parseGithubUrl(`https://github.com/${owner}/${repo}`);
    if (!parsed) continue;
    const githubUrl = canonicalGithubUrl(parsed.owner, parsed.repo);
    if (seen.has(githubUrl)) continue;
    seen.add(githubUrl);
    hits.push({
      githubUrl,
      owner: parsed.owner,
      repo: parsed.repo,
      todayStars: parseStarsToday(block),
    });
    if (hits.length >= limit) break;
  }

  return hits;
}
