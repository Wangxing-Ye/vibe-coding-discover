-- AlterEnum
ALTER TYPE "SourceType" ADD VALUE 'trending';

-- CreateTable
CREATE TABLE "today_recommendations" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "today_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "today_recommendations_date_stars_idx" ON "today_recommendations"("date", "stars");

-- CreateIndex
CREATE UNIQUE INDEX "today_recommendations_date_projectId_key" ON "today_recommendations"("date", "projectId");

-- AddForeignKey
ALTER TABLE "today_recommendations" ADD CONSTRAINT "today_recommendations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
