import { loadEnv } from "../src/lib/load-env";

loadEnv();

import { CATEGORIES } from "../src/lib/categories";
import { CURATED_PROJECTS } from "../src/data/curated-projects";
import { ingestGithubProject } from "../src/lib/pipeline";
import { prisma } from "../src/lib/db";
import { ProjectStatus } from "@prisma/client";

async function main() {
  const args = new Set(process.argv.slice(2));
  const live = args.has("--live");
  const useAi = args.has("--ai");
  const limitArg = process.argv.find((item, i, all) => all[i - 1] === "--limit");
  const limit = limitArg ? Number(limitArg) : CURATED_PROJECTS.length;
  const items = CURATED_PROJECTS.slice(0, Number.isFinite(limit) ? limit : CURATED_PROJECTS.length);

  console.log(`Importing ${items.length} curated projects (live=${live}, ai=${useAi})`);

  for (const item of items) {
    const parsed = item.githubUrl.replace("https://github.com/", "").split("/");
    const [owner, repo] = parsed;
    console.log(`- ${owner}/${repo}`);
    await ingestGithubProject({
      githubUrl: item.githubUrl,
      preferLive: live,
      publish: true,
      skipAi: !useAi,
      fallbackMeta: {
        description: item.description,
        stars: item.stars,
        forks: item.forks,
        language: item.language,
        license: item.license,
        topics: item.topics,
      },
      fallbackAnalysis: item.analysis,
    });
  }

  const published = await prisma.project.findMany({
    where: { status: ProjectStatus.published },
    include: { analysis: true },
  });

  const missing = published.filter(
    (project) =>
      !project.license ||
      !project.githubUrl ||
      !project.analysis?.aiSummary ||
      !project.analysis.tags.length ||
      !project.analysis.useCases.length,
  );

  console.log("\nQA");
  console.log(`published: ${published.length}`);
  for (const category of CATEGORIES) {
    const count = published.filter((project) => project.analysis?.category === category.id).length;
    console.log(`  ${category.name}: ${count}/${category.quota}`);
  }
  if (missing.length) {
    console.log("incomplete profiles:");
    for (const project of missing) {
      console.log(`  ${project.owner}/${project.repoName}`);
    }
    process.exitCode = 1;
  } else {
    console.log("all published projects have license, summary, tags, use cases, and GitHub URL");
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
