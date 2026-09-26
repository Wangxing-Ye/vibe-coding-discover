import Link from "next/link";
import {
  addWatchAccount,
  deleteWatchAccount,
  importWatchAccountsFromSubmissions,
  setWatchAccountEnabled,
} from "../../actions";
import { AdminActionButton } from "../../ActionButton";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function noticeText(notice: string | undefined, count: string | undefined) {
  if (!notice) return null;
  if (notice === "added") return "Account added.";
  if (notice === "deleted") return "Account deleted.";
  if (notice === "enabled") return "Account enabled.";
  if (notice === "disabled") return "Account disabled.";
  if (notice === "imported") return `Imported ${count || "0"} unique username(s) from X submissions.`;
  return null;
}

export default async function AdminWatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; count?: string }>;
}) {
  const params = await searchParams;
  const accounts = await prisma.xWatchAccount.findMany({
    orderBy: [{ enabled: "desc" }, { username: "asc" }],
  });
  const enabledCount = accounts.filter((a) => a.enabled).length;
  const message = noticeText(params.notice, params.count);
  const error = params.error === "invalid" ? "Enter a valid X username or profile/status URL." : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-secondary">
            <Link href="/admin" className="text-accent hover:underline">
              Admin
            </Link>{" "}
            / Watch list
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">X Watch list</h2>
          <p className="mt-1 text-sm text-secondary">
            {enabledCount} enabled · {accounts.length} total · worker searches{" "}
            <code className="text-xs">from:username url:&quot;github.com&quot;</code> every ~20m (rotated with
            github/x/trending)
          </p>
        </div>
        <form action={importWatchAccountsFromSubmissions}>
          <AdminActionButton
            pendingLabel="Importing…"
            className="inline-flex h-9 cursor-pointer items-center rounded-full border border-border px-4 text-sm transition-colors hover:border-foreground hover:bg-[#f4f4f5]"
          >
            Import from submissions
          </AdminActionButton>
        </form>
      </div>

      {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}

      <form action={addWatchAccount} className="mt-6 flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm">
          <span className="text-secondary">Username or X URL</span>
          <input
            name="username"
            required
            placeholder="@username or https://x.com/username/status/…"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </label>
        <label className="min-w-0 flex-1 text-sm">
          <span className="text-secondary">Notes (optional)</span>
          <input
            name="notes"
            placeholder="why watch"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </label>
        <AdminActionButton
          pendingLabel="Adding…"
          className="inline-flex h-10 cursor-pointer items-center rounded-full bg-foreground px-5 text-sm font-medium text-background"
        >
          Add
        </AdminActionButton>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last checked</th>
              <th className="px-4 py-3 font-medium">Notes / error</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-secondary">
                  No accounts yet. Add one, or import from existing X submissions.
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <a
                      href={`https://x.com/${account.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      @{account.username}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-secondary">{account.enabled ? "enabled" : "disabled"}</td>
                  <td className="px-4 py-3 text-secondary">
                    {account.lastCheckedAt ? account.lastCheckedAt.toISOString().replace("T", " ").slice(0, 19) : "—"}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-secondary">
                    {account.lastError ? (
                      <span className="text-warning">{account.lastError}</span>
                    ) : (
                      account.notes || "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-3">
                      <form action={setWatchAccountEnabled.bind(null, account.id, !account.enabled)}>
                        <AdminActionButton
                          pendingLabel="…"
                          className="cursor-pointer text-accent hover:underline"
                        >
                          {account.enabled ? "Disable" : "Enable"}
                        </AdminActionButton>
                      </form>
                      <form action={deleteWatchAccount.bind(null, account.id)}>
                        <AdminActionButton
                          pendingLabel="…"
                          className="cursor-pointer text-error hover:underline"
                        >
                          Delete
                        </AdminActionButton>
                      </form>
                    </div>
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
