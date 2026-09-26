import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export function CategoryPills({
  active,
  className = "",
  extraSearch,
}: {
  active?: string;
  className?: string;
  extraSearch?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {CATEGORIES.map((category) => {
        const href = extraSearch ? `/category/${category.slug}?${extraSearch}` : `/category/${category.slug}`;
        const isActive = active === category.slug;
        return (
          <Link
            key={category.id}
            href={href}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border text-secondary hover:border-foreground hover:text-foreground"
            }`}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
