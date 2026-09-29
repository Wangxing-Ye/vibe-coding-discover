import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/admin" className="text-2xl font-semibold tracking-tight hover:underline">
          Admin
        </Link>
        <form action={logoutAction}>
          <button className="text-sm text-secondary hover:text-foreground">Log out</button>
        </form>
      </div>
      {children}
    </div>
  );
}
