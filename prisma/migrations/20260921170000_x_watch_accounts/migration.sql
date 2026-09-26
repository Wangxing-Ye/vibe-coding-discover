-- CreateTable
CREATE TABLE "x_watch_accounts" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "x_watch_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "x_watch_accounts_username_key" ON "x_watch_accounts"("username");

-- CreateIndex
CREATE INDEX "x_watch_accounts_enabled_username_idx" ON "x_watch_accounts"("enabled", "username");
