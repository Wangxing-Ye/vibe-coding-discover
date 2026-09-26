"use client";

import { useEffect } from "react";
import { trackClient } from "./AnalyticsProvider";

export function ProjectView({ slug, githubUrl }: { slug: string; githubUrl: string }) {
  useEffect(() => {
    trackClient("project_view", { slug, githubUrl });
  }, [slug, githubUrl]);
  return null;
}
