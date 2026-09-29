# VibeCodingDiscover

AI-native discovery layer for open source. Discover and analyze open-source AI — Agents, MCP, Skills, RAG, Tools, and Frameworks — that speed up vibe coding.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- PostgreSQL 16 + Prisma
- GitHub REST API, X API, OpenAI-compatible AI (OpenAI by default)
- Docker Compose, Caddy for HTTPS
- PostHog + Sentry

## Local development

```bash
cp .env.example .env
docker compose up -d postgres
# Host access to that Postgres needs a compose override: ports: ["127.0.0.1:5432:5432"]
npx prisma migrate dev
npm run import:projects
npm run dev
```

## Worker

```bash
npm run worker
```

Discovery (enabled by default when `DISCOVER_ENABLED=true`):

- GitHub Search, X recent search, GitHub Trending, and X watchlist rotate every 5 minutes (GitHub → X → Trending → Watchlist …)
- Skips repos already in the DB for ingest (draft/published/rejected) or stars < 100
- Trusted in-scope analyses auto-publish; everything else stays draft. Missing license is kept as — (same as Submit).
- Published trending hits (and Search/X/submit with stars >= 1000) are stored in Today Recommendation

Admin: open `/admin/login` and use `ADMIN_PASSWORD`.

## Categories

Every analyzed project gets **one** catalog category. The set is a Prisma enum (`AI_AGENTS`, `MCP`, `AI_TOOLS`, `AI_CODING`, `RAG`, `SKILLS`, `AI_FRAMEWORKS`). Slugs, display names, and copy live in `src/lib/categories.ts`. AI analysis (or the GitHub-keyword heuristic if AI is down) picks the value; unknown strings normalize to `AI_TOOLS`.

- Browse `/category/[slug]` (same list as Explore: All Time / Today, stars / recent, cards / list, 100 per page)
- Homepage cards and nav pills go to `/category/[slug]`; Explore can also filter with `?category=`
- Counts on the homepage are published projects only (`getCategoryCounts`)
- Out-of-scope repos still get a closest category for admin, but they stay draft
- Curated import mix uses per-category `quota` in `src/lib/categories.ts` (`npm run import:projects`)



### Principles

- **Closed set.** Only these seven belong on the site. New buckets need a schema + metadata change, not a free-text tag.
- **One category per project.** Stored on `project_analysis.category`, not a many-to-many. Use cases are the open labels.
- **Most specific wins.** A coding agent is `AI_CODING`, not `AI_AGENTS`. An MCP server is `MCP`, not `AI_TOOLS`.
- **In-scope is separate.** `in_scope` decides auto-publish. Category is always filled so admin can sort rejects.
- **Published lists only.** Category pages and homepage counts are `status = published`.
- **Today is UTC.** `?period=today` filters `createdAt` from UTC midnight (same as Explore / Use Cases and VIBECD claim days).



## Use Cases

AI analysis writes up to 16 concrete use-case labels per project. Labels are normalized to a shared `name` + `slug`, then linked through `project_use_cases`. Only **published** projects keep those links.

- Browse `/use-cases` (search by name, All Time / Today, paginated)
- Detail `/use-cases/[slug]` lists published projects for that use case
- Homepage shows top use cases by `projectCount`
- Publish, reject, reanalyze, and delete recount affected use cases (not raw +1/−1)
- One-shot backfill: `npm run backfill:use-cases`



### Principles

- **Concrete actions, not categories.** Prefer “Search property listings with natural-language queries” over “Real Estate” or “AI Agent”.
- **One row per slug.** The same capability across repos shares one use case; `projectCount` is how many published projects link to it.
- **Published only.** Drafts and rejected projects do not appear in counts or lists (`projectCount > 0`).
- **Recount from links.** After any junction change, recount the affected IDs from live published rows so counts cannot drift.
- **List by usefulness.** `/use-cases` is `WHERE projectCount > 0 ORDER BY projectCount DESC` with `SKIP`/`TAKE`.
- **Search is the name.** The use-case search box matches `name` (case-insensitive). Domain words that are not in the label will not hit.



## Import curated projects

```bash
npm run import:projects            # ~100 curated profiles, no live APIs
npm run import:projects -- --limit 30
npm run import:projects -- --live --ai   # refresh GitHub + AI analysis
```



## Production (VPS)

1. Copy `.env.example` to `.env` and fill secrets (including `NEXT_PUBLIC_VIBECD_*`).
2. `docker compose --profile app up -d --build` — `NEXT_PUBLIC_*` are baked in at image build; changing them later needs another `--build`.
3. Point DNS to the VPS and use [deploy/Caddyfile](deploy/Caddyfile) for HTTPS.
4. Cron daily: dump via `docker compose --profile app exec -T postgres pg_dump -U vibe vibecodingdiscover` (host `5432` is not published).

KPI events: `project_view`, `github_click`, `search_query`.

## VIBECD claim (Base)

VIBECD is a commemorative memecoin for vibe coding. It is not a security, an investment product, or a guarantee of any economic benefit.

Daily claim and submission rewards are on the homepage and Submit page. Compile and deploy from **[contracts/README.md](contracts/README.md)**.