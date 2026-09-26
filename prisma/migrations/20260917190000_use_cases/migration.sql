-- CreateTable
CREATE TABLE "use_cases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "use_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_use_cases" (
    "projectId" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_use_cases_pkey" PRIMARY KEY ("projectId","useCaseId")
);

-- CreateIndex
CREATE UNIQUE INDEX "use_cases_slug_key" ON "use_cases"("slug");

-- CreateIndex
CREATE INDEX "project_use_cases_useCaseId_idx" ON "project_use_cases"("useCaseId");

-- AddForeignKey
ALTER TABLE "project_use_cases" ADD CONSTRAINT "project_use_cases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_use_cases" ADD CONSTRAINT "project_use_cases_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
