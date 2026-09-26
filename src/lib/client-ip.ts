import { NextRequest } from "next/server";

/**
 * Client IP for rate limits / claim tickets.
 *
 * Prefer X-Real-IP (Caddy overwrites this with the TCP peer).
 * Then the last X-Forwarded-For hop (closest to our proxy).
 * Local/dev with no proxy headers → "local".
 */
export function clientIp(request: NextRequest) {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const hops = (request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (hops.length) return hops[hops.length - 1];

  return "local";
}
