import Link from "next/link";

export const PAGE_SIZE = 100;

export function parsePage(raw: string | undefined | null) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

export function totalPages(totalItems: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function PaginationBar({
  page,
  totalPages: pages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (pages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pages;

  return (
    <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
      {prevDisabled ? (
        <span className="text-secondary/50">Prev</span>
      ) : (
        <Link href={makeHref(page - 1)} className="text-accent hover:underline">
          Prev
        </Link>
      )}
      <span className="text-secondary">
        {page} / {pages}
      </span>
      {nextDisabled ? (
        <span className="text-secondary/50">Next</span>
      ) : (
        <Link href={makeHref(page + 1)} className="text-accent hover:underline">
          Next
        </Link>
      )}
    </nav>
  );
}
