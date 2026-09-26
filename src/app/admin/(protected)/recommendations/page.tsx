import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatStars } from "@/lib/format";
import { todayLocalDate } from "@/lib/today-recommendation";

export const dynamic = "force-dynamic";

export default async function AdminRecommendationsPage() {
  const date = todayLocalDate();
  const rows = await prisma.todayRecommendation.findMany({
    where: { date },
    orderBy: [{ todayStars: "desc" }, { stars: "desc" }, { createdAt: "desc" }],
    include: {
      project: {
        select: { id: true, slug: true, status: true, githubUrl: true },
      },
    },
  });

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  const dateLabel = `${mm}/${dd}/${yyyy}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-secondary">
            <Link href="/admin" className="text-accent hover:underline">
              Admin
            </Link>{" "}
            / Today&apos;s Recommendations
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Today&apos;s Recommendations</h2>
          <p className="mt-1 text-sm text-secondary">
            {dateLabel} · {rows.length} entr{rows.length === 1 ? "y" : "ies"}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Stars</th>
              <th className="px-4 py-3 font-medium">Today stars</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-secondary">
                  No recommendations for today yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{row.projectName}</td>
                  <td className="px-4 py-3 text-secondary">★ {formatStars(row.stars)}</td>
                  <td className="px-4 py-3 text-secondary">{row.todayStars.toLocaleString()}</td>
                  <td className="px-4 py-3 capitalize text-secondary">{row.source}</td>
                  <td className="px-4 py-3 text-secondary">{row.project.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/projects/${row.project.id}`}
                      className="text-accent hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
