import { loadEnv } from "../lib/load-env";

loadEnv();

import { isDiscoverEnabled, runDiscovery, type DiscoverSource } from "../lib/discover";
import { processPendingSubmissions, refreshPublishedStars } from "../lib/pipeline";
import { processRunningReanalyzeJobs } from "../lib/reanalyze-job";

const POLL_MS = 5_000;
const STAR_REFRESH_MS = 6 * 60 * 60 * 1000;
const DISCOVER_MS = Number(process.env.DISCOVER_MS) > 0 ? Number(process.env.DISCOVER_MS) : 5 * 60 * 1000;

let lastStarRefresh = 0;
let lastDiscover = 0;
/** Alternate GitHub → X → Trending → Watchlist → GitHub … across discovery ticks. */
let nextDiscoverSource: DiscoverSource = "github";

function nextSource(current: DiscoverSource): DiscoverSource {
  if (current === "github") return "x";
  if (current === "x") return "trending";
  if (current === "trending") return "watchlist";
  return "github";
}

async function tick() {
  const reanalyze = await processRunningReanalyzeJobs();
  if (reanalyze.processed) {
    console.log(`reanalyze: ${reanalyze.label || reanalyze.jobId}`);
  }

  const processed = await processPendingSubmissions(5);
  if (processed > 0) {
    console.log(`processed ${processed} submission(s)`);
  }

  if (Date.now() - lastStarRefresh > STAR_REFRESH_MS) {
    lastStarRefresh = Date.now();
    console.log("refreshing GitHub stars");
    await refreshPublishedStars(20);
  }

  if (isDiscoverEnabled() && Date.now() - lastDiscover > DISCOVER_MS) {
    lastDiscover = Date.now();
    const source = nextDiscoverSource;
    nextDiscoverSource = nextSource(source);
    console.log(`running ${source} discovery`);
    const stats = await runDiscovery(source);
    console.log(
      `discover done (${source}): github=${stats.githubCandidates} x=${stats.xCandidates} trending=${stats.trendingCandidates} ` +
        `watchlist=${stats.watchlistCandidates}/${stats.watchlistAccounts} ` +
        `ingested=${stats.ingested} published=${stats.published} drafted=${stats.drafted} recommended=${stats.recommended} ` +
        `skippedExisting=${stats.skippedExisting} skippedFilter=${stats.skippedFilter} ` +
        `errors=${stats.errors.length}`,
    );
    if (stats.errors.length) {
      console.error("discover errors:", stats.errors.slice(0, 10));
    }
  }
}

async function main() {
  console.log(
    `VibeCodingDiscover worker started (discover=${isDiscoverEnabled() ? "on" : "off"}, every ${Math.round(DISCOVER_MS / 60000)}m, alternating github/x/trending/watchlist)`,
  );
  // Run discovery once shortly after boot so local/prod does not wait a full interval.
  lastDiscover = Date.now() - DISCOVER_MS + 15_000;
  while (true) {
    try {
      await tick();
    } catch (error) {
      console.error(error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

main();
