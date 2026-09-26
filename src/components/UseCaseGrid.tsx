import Link from "next/link";
import type { UseCaseWithCount } from "@/lib/use-cases";

export function UseCaseGrid({
  useCases,
  empty = "No use cases yet.",
}: {
  useCases: UseCaseWithCount[];
  empty?: string;
}) {
  if (useCases.length === 0) {
    return <p className="text-sm text-secondary">{empty}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {useCases.map((useCase) => (
        <Link
          key={useCase.id}
          href={`/use-cases/${useCase.slug}`}
          className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-foreground hover:bg-[#f4f4f5] active:bg-[#ebebeb]"
        >
          <p className="font-medium text-foreground">{useCase.name}</p>
          <p className="mt-1 text-sm text-secondary">
            {useCase.projectCount} project{useCase.projectCount === 1 ? "" : "s"}
          </p>
        </Link>
      ))}
    </div>
  );
}
