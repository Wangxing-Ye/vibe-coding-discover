import { notFound } from "next/navigation";
import { ReanalyzeProgress } from "@/app/admin/ReanalyzeProgress";
import { getReanalyzeJob, serializeReanalyzeJob } from "@/lib/reanalyze-job";

export const dynamic = "force-dynamic";

export default async function ReanalyzeJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getReanalyzeJob(id);
  if (!job) notFound();

  return <ReanalyzeProgress initialJob={serializeReanalyzeJob(job)} />;
}
