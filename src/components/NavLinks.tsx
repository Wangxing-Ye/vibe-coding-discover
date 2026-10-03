"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  {
    href: "/explore",
    label: "Explore",
    match: (path: string) => path === "/explore" || path.startsWith("/explore/") || path.startsWith("/category/"),
  },
  {
    href: "/use-cases",
    label: "Use Cases",
    match: (path: string) => path === "/use-cases" || path.startsWith("/use-cases/"),
  },
  {
    href: "/submit",
    label: "Submit",
    match: (path: string) => path === "/submit" || path.startsWith("/submit/"),
  },
  {
    href: "/vibecd",
    label: "$VIBECD",
    match: (path: string) => path === "/vibecd" || path.startsWith("/vibecd/"),
  },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm text-secondary sm:gap-6">
      {NAV.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "font-semibold text-foreground" : "hover:text-foreground"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
