export function formatStars(stars: number) {
  if (stars >= 1_000_000) {
    return `${(stars / 1_000_000).toFixed(stars >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  }
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(stars >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  }
  return String(stars);
}

export function slugifyRepo(owner: string, repo: string) {
  return `${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/**
 * Strip bytes/codepoints that break Prisma↔Postgres JSON encoding
 * (null bytes, unpaired UTF-16 surrogates → "unexpected end of hex escape").
 */
export function sanitizeForDb(value: string): string;
export function sanitizeForDb(value: string | null | undefined): string | null;
export function sanitizeForDb(value: string | null | undefined): string | null {
  if (value == null) return null;
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 0) continue;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += value[i] + value[i + 1];
        i++;
      } else {
        out += "\uFFFD";
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      out += "\uFFFD";
      continue;
    }
    out += value[i];
  }
  return out;
}

export function formatUpdatedAt(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatUpdatedAtUtc(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
