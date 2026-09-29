import OpenAI from "openai";
import { z } from "zod";
import { Category } from "@prisma/client";
import { CATEGORY_IDS, categoryLabel } from "./categories";
import type { GithubMetadata } from "./github";

const MAX_LIST = 16;
const MAX_SUMMARY = 320;

export const analysisSchema = z.object({
  in_scope: z.boolean(),
  project_type: z.string().min(1),
  category: z.enum([
    "AI_AGENTS",
    "MCP",
    "AI_TOOLS",
    "AI_CODING",
    "RAG",
    "SKILLS",
    "AI_FRAMEWORKS",
  ]),
  tags: z.array(z.string()).min(1).max(MAX_LIST),
  frameworks: z.array(z.string()).max(MAX_LIST).default([]),
  models: z.array(z.string()).max(MAX_LIST).default([]),
  capabilities: z.array(z.string()).max(MAX_LIST).default([]),
  use_cases: z.array(z.string()).min(1).max(MAX_LIST),
  summary: z.string().min(20).max(MAX_SUMMARY),
  language: z.string().optional().nullable(),
});

export type StructuredAnalysis = z.infer<typeof analysisSchema>;

const CATEGORY_GUIDE = CATEGORY_IDS.map((id) => `${id} (${categoryLabel(id)})`).join(", ");

function client() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY is not set");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
  });
}

export async function analyzeProject(meta: GithubMetadata): Promise<StructuredAnalysis> {
  const openai = client();
  const model = process.env.AI_MODEL || "gpt-6-luna";

  const prompt = `You are classifying a GitHub open source project for VibeCodingDiscover, an AI-native discovery layer for open source.

Catalog categories (ONLY these belong on the site):
${CATEGORY_GUIDE}

Return ONLY valid JSON with this shape:
{
  "in_scope": true,
  "project_type": "agent|mcp|tool|coding|rag|skill|framework|other",
  "category": one of ${CATEGORY_GUIDE},
  "tags": ["up to 16 short tags"],
  "frameworks": ["up to 16 frameworks used"],
  "models": ["up to 16 models mentioned if any"],
  "use_cases": ["up to 16 concrete use cases"],
  "summary": "1-3 sentence AI summary, max 320 chars, no marketing fluff",
  "language": "primary language"
}

in_scope = true ONLY if the project is primarily about:
- AI agents, multi-agent systems, computer-use agents
- MCP servers/SDKs
- AI developer tools (LLM ops, evals, chat UIs for models, AI image/video gen workflows)
- AI coding agents / IDE assistants
- RAG, embeddings, vector knowledge pipelines
- Agent skills / prompt-capability packs
- LLM/AI application frameworks and inference engines (LangChain, vLLM, Ollama, llama.cpp)

in_scope = false for general software even if popular: whiteboards, remote desktop, game engines, generic BaaS/databases/auth, CRMs, note apps, OS tools, unless the repo is specifically an AI/LLM/agent product.

If in_scope is false, still pick the closest category for admin display, but the project must not be recommended for publish.

Rules:
- Prefer the most specific category when in_scope is true.
- tags, frameworks, models, and use_cases: at most 16 items each; pick the most important.
- summary must help a developer decide whether to open GitHub in under 10 seconds.
- Do not invent licenses or stars.

Repository:
Name: ${meta.owner}/${meta.repoName}
Description: ${meta.description || "n/a"}
Language: ${meta.language || "n/a"}
Topics: ${meta.topics.join(", ") || "n/a"}
License: ${meta.license || "n/a"}
File tree (partial): ${meta.fileTree.slice(0, 80).join(", ") || "n/a"}
Dependencies (partial): ${JSON.stringify(meta.dependencies).slice(0, 2500)}
README (truncated):
${meta.readmeExcerpt || "n/a"}`;

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You output strict JSON for a GitHub project profile. Never include markdown. in_scope must be a boolean. Category must be an allowed enum key.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty AI response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.category === "string") {
    record.category = normalizeCategory(record.category);
  }
  if (typeof record.in_scope === "string") {
    record.in_scope = ["true", "yes", "1"].includes(record.in_scope.toLowerCase());
  }
  if (typeof record.in_scope !== "boolean") {
    record.in_scope = false;
  }

  record.tags = clipStringList(record.tags);
  record.frameworks = clipStringList(record.frameworks);
  record.models = clipStringList(record.models);
  record.capabilities = [];
  record.use_cases = clipStringList(record.use_cases);
  if (typeof record.summary === "string") {
    record.summary = record.summary.trim().slice(0, MAX_SUMMARY);
  }

  return analysisSchema.parse(record);
}

function clipStringList(value: unknown, max = MAX_LIST): string[] {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,|\n]/).map((item) => item.trim())
      : [];
  return items.map((item) => String(item).trim()).filter(Boolean).slice(0, max);
}

function normalizeCategory(value: string): Category {
  const compact = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (CATEGORY_IDS.includes(compact as Category)) {
    return compact as Category;
  }
  const byName: Record<string, Category> = {
    "AI AGENTS": "AI_AGENTS",
    MCP: "MCP",
    "AI TOOLS": "AI_TOOLS",
    "AI CODING": "AI_CODING",
    RAG: "RAG",
    SKILLS: "SKILLS",
    FRAMEWORKS: "AI_FRAMEWORKS",
    "AI FRAMEWORKS": "AI_FRAMEWORKS",
  };
  return byName[value.trim().toUpperCase()] ?? "AI_TOOLS";
}

export function hasAiConfigured() {
  return Boolean(process.env.AI_API_KEY);
}
