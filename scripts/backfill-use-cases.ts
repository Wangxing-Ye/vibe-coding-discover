import { loadEnv } from "../src/lib/load-env";

loadEnv();

import { backfillPublishedUseCases } from "../src/lib/use-cases";
import { prisma } from "../src/lib/db";

async function main() {
  const count = await backfillPublishedUseCases();
  const useCases = await prisma.useCase.count();
  const links = await prisma.projectUseCase.count();
  console.log(`Backfilled use cases for ${count} published project(s).`);
  console.log(`use_cases=${useCases} project_use_cases=${links}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
