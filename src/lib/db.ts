import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  const existing = globalForPrisma.prisma;
  // After `prisma generate`, an old global client may miss new models.
  if (
    existing &&
    "projectUseCase" in existing &&
    "useCase" in existing &&
    "reanalyzeJob" in existing
  ) {
    return existing;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();

