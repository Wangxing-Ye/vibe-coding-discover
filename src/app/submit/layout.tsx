import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit an AI Project",
  description: "Submit a GitHub repository, X post or Youtube url. No login required.",
  alternates: { canonical: "/submit" },
};

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
