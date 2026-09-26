-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'published', 'rejected');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('AI_AGENTS', 'MCP', 'AI_TOOLS', 'AI_CODING', 'RAG', 'SKILLS', 'AI_FRAMEWORKS');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('github', 'x');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'analyzing', 'needs_review', 'published', 'rejected');

-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('github_fetch', 'x_extract', 'ai_analysis', 'star_refresh', 'import');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'running', 'success', 'failed');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "license" TEXT,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readmeExcerpt" TEXT,
    "lastCommitAt" TIMESTAMP(3),
    "githubCreatedAt" TIMESTAMP(3),
    "githubUpdatedAt" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_analysis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "frameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "models" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "useCases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiSummary" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "project_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "githubUrl" TEXT,
    "submitterEmail" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "projectId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "jobType" "SyncJobType" NOT NULL,
    "target" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_githubUrl_key" ON "projects"("githubUrl");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_stars_idx" ON "projects"("status", "stars");

-- CreateIndex
CREATE INDEX "projects_status_createdAt_idx" ON "projects"("status", "createdAt");

-- CreateIndex
CREATE INDEX "projects_owner_repoName_idx" ON "projects"("owner", "repoName");

-- CreateIndex
CREATE UNIQUE INDEX "project_analysis_projectId_key" ON "project_analysis"("projectId");

-- CreateIndex
CREATE INDEX "project_analysis_category_idx" ON "project_analysis"("category");

-- CreateIndex
CREATE INDEX "submissions_status_submittedAt_idx" ON "submissions"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "sync_logs_status_createdAt_idx" ON "sync_logs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "sync_logs_jobType_createdAt_idx" ON "sync_logs"("jobType", "createdAt");

-- AddForeignKey
ALTER TABLE "project_analysis" ADD CONSTRAINT "project_analysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
