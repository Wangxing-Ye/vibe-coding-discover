"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 7h7v7" />
    </svg>
  );
}

function RecentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

export function ExploreOrderToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const order = searchParams.get("order") === "recent" ? "recent" : "stars";

  function hrefFor(next: "stars" | "recent") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "recent") params.set("order", "recent");
    else params.delete("order");
    params.delete("page");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors";

  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      <Link
        href={hrefFor("stars")}
        title="Trending"
        aria-label="Sort by trending"
        aria-current={order === "stars" ? "page" : undefined}
        className={`${btn} ${
          order === "stars" ? "bg-foreground text-background" : "text-secondary hover:text-foreground"
        }`}
      >
        <TrendingIcon className="h-4 w-4" />
      </Link>
      <Link
        href={hrefFor("recent")}
        title="Recently"
        aria-label="Sort by recently added"
        aria-current={order === "recent" ? "page" : undefined}
        className={`${btn} ${
          order === "recent" ? "bg-foreground text-background" : "text-secondary hover:text-foreground"
        }`}
      >
        <RecentIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}
