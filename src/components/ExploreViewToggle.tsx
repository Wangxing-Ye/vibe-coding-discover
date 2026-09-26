"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function CardsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13" />
      <path strokeLinecap="round" d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function ExploreViewToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "cards";

  function hrefFor(next: "cards" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") params.set("view", "list");
    else params.delete("view");
    // Switching layout should return to the first page of results.
    params.delete("page");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors";

  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      <Link
        href={hrefFor("cards")}
        title="Cards"
        aria-label="Cards view"
        aria-current={view === "cards" ? "page" : undefined}
        className={`${btn} ${
          view === "cards" ? "bg-foreground text-background" : "text-secondary hover:text-foreground"
        }`}
      >
        <CardsIcon className="h-4 w-4" />
      </Link>
      <Link
        href={hrefFor("list")}
        title="List"
        aria-label="List view"
        aria-current={view === "list" ? "page" : undefined}
        className={`${btn} ${
          view === "list" ? "bg-foreground text-background" : "text-secondary hover:text-foreground"
        }`}
      >
        <ListIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}
