"use client";

import { trackClient } from "./AnalyticsProvider";

export function GithubClick({ href, slug }: { href: string; slug: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackClient("github_click", { slug, githubUrl: href })}
      className="inline-flex h-11 shrink-0 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background"
    >
      View on GitHub
    </a>
  );
}
