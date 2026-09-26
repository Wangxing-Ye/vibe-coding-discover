import { Category } from "@prisma/client";

export type CategoryMeta = {
  id: Category;
  slug: string;
  name: string;
  quota: number;
  description: string;
};

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "AI_AGENTS",
    slug: "ai-agents",
    name: "AI Agents",
    quota: 25,
    description: "Autonomous and stateful agents for research, coding, and workflows.",
  },
  {
    id: "MCP",
    slug: "mcp",
    name: "MCP",
    quota: 20,
    description: "Model Context Protocol servers, SDKs, and tooling.",
  },
  {
    id: "AI_TOOLS",
    slug: "ai-tools",
    name: "AI Tools",
    quota: 20,
    description: "Developer tools for evaluation, observability, and AI operations.",
  },
  {
    id: "AI_CODING",
    slug: "ai-coding",
    name: "AI Coding",
    quota: 10,
    description: "Coding agents, IDE assistants, and software engineering automations.",
  },
  {
    id: "RAG",
    slug: "rag",
    name: "RAG",
    quota: 10,
    description: "Retrieval, memory, and knowledge pipelines for grounded generation.",
  },
  {
    id: "SKILLS",
    slug: "skills",
    name: "Skills",
    quota: 5,
    description: "Reusable agent skills, prompts, and capability packages.",
  },
  {
    id: "AI_FRAMEWORKS",
    slug: "ai-frameworks",
    name: "AI Frameworks",
    quota: 10,
    description: "Core frameworks for building LLM applications.",
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryMeta(id: Category) {
  return CATEGORIES.find((c) => c.id === id)!;
}

export function categoryLabel(id: Category) {
  return getCategoryMeta(id).name;
}
