-- AlterTable
ALTER TABLE "today_recommendations" ADD COLUMN "todayStars" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "today_recommendations_date_todayStars_idx" ON "today_recommendations"("date", "todayStars");
