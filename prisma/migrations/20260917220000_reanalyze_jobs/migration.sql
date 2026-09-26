-- CreateEnum
CREATE TYPE "ReanalyzeJobStatus" AS ENUM ('pending', 'running', 'paused', 'stopped', 'completed', 'failed');

-- CreateTable
CREATE TABLE "reanalyze_jobs" (
    "id" TEXT NOT NULL,
    "status" "ReanalyzeJobStatus" NOT NULL DEFAULT 'pending',
    "total" INTEGER NOT NULL DEFAULT 0,
    "done" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "projectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentProjectId" TEXT,
    "currentLabel" TEXT,
    "lastError" TEXT,
    "events" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reanalyze_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reanalyze_jobs_status_createdAt_idx" ON "reanalyze_jobs"("status", "createdAt");
