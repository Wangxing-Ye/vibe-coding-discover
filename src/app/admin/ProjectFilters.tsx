"use client";

import { ExportProjectsButton } from "@/components/ExportProjectsButton";
import { CATEGORIES } from "@/lib/categories";
import type { ExportProjectRow } from "@/lib/export-projects-csv";
import { ReanalyzeAllButton } from "@/app/admin/ReanalyzeAllButton";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

const ORDERS = [
  { value: "updated", label: "Updated Desc" },
  { value: "stars", label: "Stars Desc" },
];

const LICENSES = [
  { value: "", label: "All licenses" },
  { value: "MIT", label: "MIT" },
  { value: "Apache-2.0", label: "Apache-2.0" },
  { value: "GPL-3.0", label: "GPL-3.0" },
  { value: "AGPL-3.0", label: "AGPL-3.0" },
  { value: "BSD-2-Clause", label: "BSD-2-Clause" },
  { value: "BSD-3-Clause", label: "BSD-3-Clause" },
  { value: "MPL-2.0", label: "MPL-2.0" },
  { value: "Custom", label: "Custom" },
  { value: "none", label: "—" },
];

export function AdminProjectFilters({
  q,
  updated,
  status,
  category,
  license,
  order,
  exportRows,
  txtIntro,
}: {
  q: string;
  updated: string;
  status: string;
  category: string;
  license: string;
  order: string;
  exportRows: ExportProjectRow[];
  txtIntro?: string;
}) {
  const fieldClass = "h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <form method="get" action="/admin/projects" className="flex flex-wrap items-center gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name"
          className={`${fieldClass} w-full min-w-[16rem] sm:w-64`}
        />
        <input
          name="updated"
          defaultValue={updated}
          placeholder="MM/DD/YYYY"
          aria-label="Updated Date"
          title="Updated Date (MM/DD/YYYY, empty for all time)"
          inputMode="numeric"
          autoComplete="off"
          className={`${fieldClass} w-[8.5rem]`}
        />
        <select
          name="status"
          defaultValue={status}
          className={`${fieldClass} cursor-pointer`}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {STATUSES.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category}
          className={`${fieldClass} cursor-pointer`}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          name="license"
          defaultValue={license}
          className={`${fieldClass} cursor-pointer`}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {LICENSES.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          name="order"
          defaultValue={order}
          className={`${fieldClass} cursor-pointer`}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {ORDERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 cursor-pointer rounded-full bg-foreground px-5 text-sm font-medium text-background hover:opacity-90"
        >
          Search
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <ReanalyzeAllButton />
        <ExportProjectsButton rows={exportRows} txtIntro={txtIntro} />
      </div>
    </div>
  );
}
