-- AlterTable
ALTER TABLE "use_cases" ADD COLUMN "projectCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "use_cases_projectCount_idx" ON "use_cases"("projectCount");

-- Backfill published-project counts
UPDATE "use_cases" AS uc
SET "projectCount" = COALESCE((
  SELECT COUNT(*)::integer
  FROM "project_use_cases" AS puc
  INNER JOIN "projects" AS p ON p.id = puc."projectId"
  WHERE puc."useCaseId" = uc.id
    AND p.status = 'published'
), 0);
