"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { trackClient } from "./AnalyticsProvider";

export function SearchBox({
  initialQuery = "",
  size = "lg",
  placeholder = "Search projects...",
  order,
  view,
  period,
  basePath = "/explore",
  label = "Search projects",
}: {
  initialQuery?: string;
  size?: "lg" | "sm";
  placeholder?: string;
  order?: "stars" | "recent";
  view?: "cards" | "list";
  period?: "today";
  basePath?: string;
  label?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    trackClient("search_query", { query: q, basePath });
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (order === "recent") params.set("order", "recent");
    if (view === "list") params.set("view", "list");
    if (period === "today") params.set("period", "today");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full items-center gap-2">
      <label htmlFor="search" className="sr-only">
        {label}
      </label>
      <input
        id="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 rounded-xl border border-border bg-background text-foreground outline-none placeholder:text-[#c5c9d0] focus:border-accent ${
          size === "lg" ? "h-12 px-4 text-base" : "h-10 px-3 text-sm"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-full bg-foreground font-medium text-background hover:opacity-90 ${
          size === "lg" ? "h-12 px-5 text-base" : "h-10 px-4 text-sm"
        }`}
      >
        Search
      </button>
    </form>
  );
}
