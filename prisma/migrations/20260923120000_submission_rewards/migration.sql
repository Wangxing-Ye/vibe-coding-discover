-- AlterTable
ALTER TABLE "submissions" ADD COLUMN "submitterIp" TEXT;

-- CreateIndex
CREATE INDEX "submissions_submitterIp_submittedAt_idx" ON "submissions"("submitterIp", "submittedAt");

-- CreateTable
CREATE TABLE "submission_rewards" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "amount" TEXT NOT NULL DEFAULT '20000',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "nonce" TEXT,
    "claimWallet" TEXT,
    "issuedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submission_rewards_submissionId_key" ON "submission_rewards"("submissionId");

-- CreateIndex
CREATE INDEX "submission_rewards_ip_day_idx" ON "submission_rewards"("ip", "day");

-- CreateIndex
CREATE INDEX "submission_rewards_status_ip_idx" ON "submission_rewards"("status", "ip");

-- AddForeignKey
ALTER TABLE "submission_rewards" ADD CONSTRAINT "submission_rewards_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
