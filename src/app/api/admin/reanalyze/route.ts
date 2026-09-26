import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createReanalyzeAllJob, serializeReanalyzeJob } from "@/lib/reanalyze-job";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job, created } = await createReanalyzeAllJob();
  return NextResponse.json({
    ok: true,
    created,
    job: serializeReanalyzeJob(job),
  });
}
