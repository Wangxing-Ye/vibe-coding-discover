export const SITE_NAME = "Vibe Coding Discover";
export const SITE_TAGLINE = "Discover AI Open Source for Vibe Coding";
export const SITE_DESCRIPTION =
  "Discover top AI open source — Agents, MCP, Skills, RAG, Tools and Frameworks. Vibe Coding Discover helps you find the right project so you can code faster.";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function absoluteUrl(path: string) {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
