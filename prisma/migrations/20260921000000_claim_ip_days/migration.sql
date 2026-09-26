-- CreateTable
CREATE TABLE "claim_ip_days" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "wallet" TEXT,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_ip_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claim_ip_days_day_idx" ON "claim_ip_days"("day");

-- CreateIndex
CREATE UNIQUE INDEX "claim_ip_days_ip_day_key" ON "claim_ip_days"("ip", "day");
