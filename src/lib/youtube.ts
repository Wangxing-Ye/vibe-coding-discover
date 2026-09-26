import { allGithubUrls } from "./x";
import { formatNetworkError, withRetries } from "./network";

const YOUTUBE_WATCH_RE =
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})(?:[&?#]|$)/i;
const YOUTUBE_SHORT_RE = /^https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#]|$)/i;
const YOUTUBE_SHORTS_RE =
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(?:[?&#]|$)/i;
const YOUTUBE_EMBED_RE =
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})(?:[?&#]|$)/i;

export function parseYoutubeUrl(raw: string): { url: string; id: string } | null {
  const trimmed = raw.trim();
  const match =
    trimmed.match(YOUTUBE_WATCH_RE) ||
    trimmed.match(YOUTUBE_SHORT_RE) ||
    trimmed.match(YOUTUBE_SHORTS_RE) ||
    trimmed.match(YOUTUBE_EMBED_RE);
  if (!match) return null;
  return { id: match[1], url: `https://www.youtube.com/watch?v=${match[1]}` };
}

export type YoutubeExtractResult = {
  text: string;
  title: string | null;
  githubUrl: string | null;
  githubUrls: string[];
  source: "youtube_api" | "watch_html" | "none";
};

function youtubeApiKey() {
  return (process.env.YOUTUBE_API_KEY || "").trim();
}

export function hasYoutubeApiKey() {
  return Boolean(youtubeApiKey());
}

async function extractFromYoutubeApi(videoId: string): Promise<{ title: string | null; text: string } | null> {
  const key = youtubeApiKey();
  if (!key) return null;

  let res: Response;
  try {
    const params = new URLSearchParams({
      part: "snippet",
      id: videoId,
      key,
    });
    res = await withRetries("YouTube Data API", () =>
      fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
        headers: { "User-Agent": "VibeCodingDiscover/1.0" },
      }),
    );
  } catch (error) {
    throw new Error(formatNetworkError(error, "googleapis.com"));
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    items?: { snippet?: { title?: string; description?: string } }[];
  };
  const snippet = json.items?.[0]?.snippet;
  if (!snippet) return null;
  return {
    title: snippet.title || null,
    text: [snippet.title, snippet.description].filter(Boolean).join("\n"),
  };
}

function decodeJsonStringLiteral(raw: string) {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

async function extractFromWatchHtml(videoId: string): Promise<{ title: string | null; text: string } | null> {
  let res: Response;
  try {
    res = await withRetries("YouTube watch page", () =>
      fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; VibeCodingDiscover/1.0; +https://github.com/vibecodingdiscover)",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }),
    );
  } catch (error) {
    throw new Error(formatNetworkError(error, "youtube.com"));
  }

  if (!res.ok) return null;
  const html = await res.text();

  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\})\s*;/);
  if (playerMatch) {
    try {
      const data = JSON.parse(playerMatch[1]) as {
        videoDetails?: { title?: string; shortDescription?: string };
      };
      const details = data.videoDetails;
      if (details?.shortDescription != null) {
        return {
          title: details.title || null,
          text: [details.title, details.shortDescription].filter(Boolean).join("\n"),
        };
      }
    } catch {
      // fall through to regex
    }
  }

  const shortMatch = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
  if (!shortMatch) return null;
  const description = decodeJsonStringLiteral(shortMatch[1]);
  const titleMatch = html.match(/"videoDetails":\{"videoId":"[^"]+","title":"((?:\\.|[^"\\])*)"/);
  const title = titleMatch ? decodeJsonStringLiteral(titleMatch[1]) : null;
  return {
    title,
    text: [title, description].filter(Boolean).join("\n"),
  };
}

export async function extractGithubFromYoutube(url: string): Promise<YoutubeExtractResult> {
  const parsed = parseYoutubeUrl(url);
  if (!parsed) {
    return { text: "", title: null, githubUrl: null, githubUrls: [], source: "none" };
  }

  try {
    const api = await extractFromYoutubeApi(parsed.id);
    if (api?.text) {
      const githubUrls = allGithubUrls(api.text);
      if (githubUrls.length) {
        return {
          text: api.text,
          title: api.title,
          githubUrl: githubUrls[0],
          githubUrls,
          source: "youtube_api",
        };
      }
    }
  } catch {
    // Fall through to HTML scrape when API fails or is missing.
  }

  const html = await extractFromWatchHtml(parsed.id);
  if (html?.text) {
    const githubUrls = allGithubUrls(html.text);
    return {
      text: html.text,
      title: html.title,
      githubUrl: githubUrls[0] ?? null,
      githubUrls,
      source: githubUrls.length ? "watch_html" : "none",
    };
  }

  return { text: "", title: null, githubUrl: null, githubUrls: [], source: "none" };
}
