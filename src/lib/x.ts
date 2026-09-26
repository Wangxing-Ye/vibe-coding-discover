import { canonicalGithubUrl, parseGithubUrl } from "./github";
import { formatNetworkError, withRetries } from "./network";

const X_STATUS_RE =
  /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/(\d+)/i;
const GITHUB_IN_TEXT_RE =
  /(?:https?:\/\/(?:www\.)?)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[^\s]*)?/gi;

export function parseXUrl(raw: string) {
  const match = raw.trim().match(X_STATUS_RE);
  return match ? { url: match[0], id: match[1] } : null;
}

export type XExtractResult = {
  text: string;
  githubUrl: string | null;
  githubUrls: string[];
  source: "x_api" | "oembed" | "fxtwitter" | "none";
};

type XUrlEntity = {
  url?: string;
  expanded_url?: string;
  display_url?: string;
};

type XTweetPayload = {
  text?: string;
  entities?: { urls?: XUrlEntity[] };
  note_tweet?: {
    text?: string;
    entities?: { urls?: XUrlEntity[] };
  };
};

function bearerToken() {
  const raw = process.env.X_BEARER_TOKEN || "";
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function blobFromUrls(urls: XUrlEntity[] | undefined) {
  if (!urls?.length) return "";
  return urls
    .map((item) => item.expanded_url)
    .filter((item): item is string => Boolean(item))
    .join("\n");
}

function tweetBlob(tweet: XTweetPayload) {
  return [
    tweet.note_tweet?.text,
    tweet.text,
    blobFromUrls(tweet.note_tweet?.entities?.urls),
    blobFromUrls(tweet.entities?.urls),
  ]
    .filter(Boolean)
    .join("\n");
}

async function extractFromXApi(id: string): Promise<string | null> {
  const token = bearerToken();
  if (!token) return null;
  const fields = "tweet.fields=text,entities,note_tweet";
  const res = await fetch(`https://api.x.com/2/tweets/${id}?${fields}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: XTweetPayload };
  if (!json.data) return null;
  return tweetBlob(json.data);
}

async function extractFromOEmbed(url: string): Promise<string | null> {
  const endpoint = `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint, { headers: { "User-Agent": "VibeCodingDiscover/1.0" } });
  if (!res.ok) return null;
  const json = (await res.json()) as { html?: string };
  if (!json.html) return null;
  return json.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function extractFromFxTwitter(id: string): Promise<string | null> {
  const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
    headers: { "User-Agent": "VibeCodingDiscover/1.0" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    tweet?: {
      text?: string;
      urls?: { expanded_url?: string; display_url?: string; url?: string }[];
    };
  };
  const tweet = json.tweet;
  if (!tweet) return null;
  return [tweet.text, blobFromUrls(tweet.urls)].filter(Boolean).join("\n");
}

export function allGithubUrls(text: string) {
  const seen = new Set<string>();
  const matches = text.match(GITHUB_IN_TEXT_RE) ?? [];
  for (const raw of matches) {
    if (/…|\.\.\./.test(raw)) continue;
    const parsed = parseGithubUrl(raw.replace(/[).,]+$/, ""));
    if (!parsed) continue;
    seen.add(canonicalGithubUrl(parsed.owner, parsed.repo));
  }
  return [...seen];
}

export async function extractGithubFromX(url: string): Promise<XExtractResult> {
  const parsed = parseXUrl(url);
  if (!parsed) {
    return { text: "", githubUrl: null, githubUrls: [], source: "none" };
  }

  const apiText = await extractFromXApi(parsed.id);
  if (apiText) {
    const githubUrls = allGithubUrls(apiText);
    if (githubUrls.length) {
      return { text: apiText, githubUrl: githubUrls[0], githubUrls, source: "x_api" };
    }
  }

  const oembedText = await extractFromOEmbed(parsed.url);
  if (oembedText) {
    const githubUrls = allGithubUrls(oembedText);
    if (githubUrls.length) {
      return { text: oembedText, githubUrl: githubUrls[0], githubUrls, source: "oembed" };
    }
  }

  const fxText = await extractFromFxTwitter(parsed.id);
  if (fxText) {
    const githubUrls = allGithubUrls(fxText);
    if (githubUrls.length) {
      return { text: fxText, githubUrl: githubUrls[0], githubUrls, source: "fxtwitter" };
    }
  }

  return {
    text: apiText || oembedText || fxText || "",
    githubUrl: null,
    githubUrls: [],
    source: "none",
  };
}

export function hasXBearer() {
  return Boolean(bearerToken());
}

export type XSearchHit = {
  tweetId: string;
  tweetUrl: string;
  text: string;
  githubUrls: string[];
};

export async function searchRecentTweetsWithGithub(options: {
  query: string;
  maxResults?: number;
}): Promise<XSearchHit[]> {
  const token = bearerToken();
  if (!token) return [];

  const maxResults = Math.min(Math.max(options.maxResults ?? 20, 10), 100);
  const params = new URLSearchParams({
    query: options.query,
    max_results: String(maxResults),
    "tweet.fields": "text,entities,note_tweet,author_id",
    expansions: "author_id",
    "user.fields": "username",
  });

  let res: Response;
  try {
    res = await withRetries("X recent search", () =>
      fetch(`https://api.x.com/2/tweets/search/recent?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  } catch (error) {
    throw new Error(formatNetworkError(error, "api.x.com"));
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X search ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data?: (XTweetPayload & { id?: string; author_id?: string })[];
    includes?: { users?: { id: string; username?: string }[] };
  };

  const users = new Map((json.includes?.users ?? []).map((user) => [user.id, user.username || "i"]));
  const hits: XSearchHit[] = [];

  for (const tweet of json.data ?? []) {
    if (!tweet.id) continue;
    const blob = tweetBlob(tweet);
    const githubUrls = allGithubUrls(blob);
    if (!githubUrls.length) continue;
    const username = (tweet.author_id && users.get(tweet.author_id)) || "i";
    hits.push({
      tweetId: tweet.id,
      tweetUrl: `https://x.com/${username}/status/${tweet.id}`,
      text: blob,
      githubUrls,
    });
  }

  return hits;
}
