import { Prisma, SyncJobType, SyncStatus } from "@prisma/client";
import { prisma } from "./db";

export async function startSyncLog(jobType: SyncJobType, target: string, payload?: Prisma.InputJsonValue) {
  return prisma.syncLog.create({
    data: {
      jobType,
      target,
      status: SyncStatus.running,
      payload,
    },
  });
}

export async function finishSyncLog(
  id: string,
  status: SyncStatus,
  extra?: { error?: string; payload?: Prisma.InputJsonValue },
) {
  return prisma.syncLog.update({
    where: { id },
    data: {
      status,
      error: extra?.error,
      payload: extra?.payload,
    },
  });
}
