const X_HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
const X_URL_USER_RE = /(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)/i;
const RESERVED = new Set([
  "status",
  "i",
  "intent",
  "share",
  "search",
  "home",
  "explore",
  "settings",
  "messages",
  "notifications",
  "compose",
]);

/** Normalize `@user`, bare handle, or x.com URL → lowercase username. */
export function normalizeXUsername(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fromUrl = trimmed.match(X_URL_USER_RE);
  const candidate = (fromUrl?.[1] || trimmed.replace(/^@/, "")).toLowerCase();
  if (!X_HANDLE_RE.test(candidate)) return null;
  if (RESERVED.has(candidate)) return null;
  return candidate;
}

export function watchlistXQuery(username: string) {
  // Prefer url: operator — many posts only link github via cards/t.co, not literal "github.com" text.
  return `from:${username} url:"github.com" -is:retweet`;
}
