import { prisma } from "@/lib/db";
import { MAX_REWARDS_PER_IP_PER_DAY, utcDay } from "@/lib/rewards";

const CLAIMABLE_REWARD_STATUSES = ["pending", "issued"] as const;

function isAlreadyOnSiteNote(notes: string | null) {
  return Boolean(notes?.startsWith("Already published."));
}

/** Drop pending/issued rewards that were granted for repos already on the site. */
export async function voidIneligibleSubmissionRewards(ip?: string) {
  await prisma.submissionReward.updateMany({
    where: {
      ...(ip ? { ip } : {}),
      status: { in: [...CLAIMABLE_REWARD_STATUSES] },
      submission: { notes: { startsWith: "Already published." } },
    },
    data: { status: "void" },
  });
}

/**
 * Grant 20k only when a human submission newly publishes a project.
 * Already-on-site duplicates, review queues, and auto-discover do not earn rewards.
 * Cap: 10 rewards per submitter IP per UTC day.
 */
export async function maybeGrantSubmissionReward(
  submissionId: string,
  options: { newlyPublished: boolean },
) {
  if (!options.newlyPublished) {
    return { granted: false, reason: "not_new" as const };
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { reward: true },
  });
  if (!submission) return { granted: false, reason: "missing" as const };
  if (submission.reward) return { granted: false, reason: "exists" as const };
  if (submission.status !== "published") return { granted: false, reason: "not_published" as const };
  if (!submission.projectId) return { granted: false, reason: "no_project" as const };
  if (isAlreadyOnSiteNote(submission.notes)) {
    return { granted: false, reason: "already_on_site" as const };
  }
  if (submission.notes?.startsWith("auto-discover:")) {
    return { granted: false, reason: "auto_discover" as const };
  }
  if (!submission.submitterIp) return { granted: false, reason: "no_ip" as const };

  const day = utcDay();
  const usedToday = await prisma.submissionReward.count({
    where: {
      ip: submission.submitterIp,
      day,
      status: { not: "void" },
    },
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

export { CLAIMABLE_REWARD_STATUSES };
