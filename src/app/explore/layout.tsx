import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore",
  description: "Search curated AI Agents, Skills, MCP, RAG and Tools projects.",
  alternates: { canonical: "/explore" },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
