import { prisma } from "@/lib/db";
import { MAX_REWARDS_PER_IP_PER_DAY, utcDay } from "@/lib/rewards";

/**
 * Grant a 20k submission reward when a human submission is published.
 * Cap: 10 rewards per submitter IP per UTC day.
 */
export async function maybeGrantSubmissionReward(submissionId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { reward: true },
  });
  if (!submission) return { granted: false, reason: "missing" as const };
  if (submission.reward) return { granted: false, reason: "exists" as const };
  if (submission.status !== "published") return { granted: false, reason: "not_published" as const };
  if (!submission.projectId) return { granted: false, reason: "no_project" as const };
  if (submission.notes?.startsWith("auto-discover:")) {
    return { granted: false, reason: "auto_discover" as const };
  }
  if (!submission.submitterIp) return { granted: false, reason: "no_ip" as const };

  const day = utcDay();
  const usedToday = await prisma.submissionReward.count({
    where: { ip: submission.submitterIp, day },
  });
  if (usedToday >= MAX_REWARDS_PER_IP_PER_DAY) {
    return { granted: false, reason: "ip_cap" as const };
  }

  await prisma.submissionReward.create({
    data: {
      submissionId: submission.id,
      ip: submission.submitterIp,
      day,
      amount: "20000",
      status: "pending",
    },
  });

  return { granted: true as const };
}
