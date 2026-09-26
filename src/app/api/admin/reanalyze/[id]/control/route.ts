import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getReanalyzeJob,
  processReanalyzeJobOnce,
  ReanalyzeStatus,
  serializeReanalyzeJob,
  setReanalyzeJobStatus,
  type ReanalyzeStatusValue,
} from "@/lib/reanalyze-job";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action;

  if (action === "tick") {
    await processReanalyzeJobOnce(id);
    const job = await getReanalyzeJob(id);
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job: serializeReanalyzeJob(job) });
  }

  const statusMap: Record<string, ReanalyzeStatusValue> = {
    pause: ReanalyzeStatus.paused,
    resume: ReanalyzeStatus.running,
    stop: ReanalyzeStatus.stopped,
  };

  const nextStatus = action ? statusMap[action] : undefined;
  if (!nextStatus) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await setReanalyzeJobStatus(id, nextStatus);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ job: serializeReanalyzeJob(updated) });
}
