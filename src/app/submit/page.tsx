"use client";

import { FormEvent, useState, type ReactNode } from "react";
import Link from "next/link";
import { RewardsClaimSection } from "@/components/RewardsClaimSection";

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ok";
      message: string;
      slugs: string[];
      newlyPublishedSlugs: string[];
      alreadyPublishedSlugs: string[];
      published: boolean;
    }
  | { status: "error"; message: string };

function ProjectResultLinks({ title, slugs }: { title: string; slugs: string[] }) {
  if (!slugs.length) return null;
  return (
    <div className="mt-2">
      <p className="text-secondary">{title}</p>
      {slugs.length === 1 ? (
        <Link href={`/projects/${slugs[0]}`} className="underline">
          View project
        </Link>
      ) : (
        <ul className="mt-1 space-y-1">
          {slugs.map((slug) => (
            <li key={slug}>
              <Link href={`/projects/${slug}`} className="underline">
                {slug}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubmitForm({
  title,
  description,
  placeholder,
  sourceType,
  button,
  onPublished,
}: {
  title: string;
  description: ReactNode;
  placeholder: string;
  sourceType: "github" | "x" | "youtube";
  button: string;
  onPublished?: () => void;
}) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, sourceUrl: url, submitterEmail: email || undefined }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        slug?: string;
        slugs?: string[];
        newlyPublishedSlugs?: string[];
        alreadyPublishedSlugs?: string[];
        published?: boolean;
        publishedCount?: number;
      };
      if (!res.ok) {
        setState({ status: "error", message: json.error || "Submission failed" });
        return;
      }
      const slugs = json.slugs?.length ? json.slugs : json.slug ? [json.slug] : [];
      const newlyPublishedSlugs = json.newlyPublishedSlugs ?? [];
      const alreadyPublishedSlugs = json.alreadyPublishedSlugs ?? [];
      const published = Boolean(json.published) || (json.publishedCount ?? 0) > 0;
      setState({
        status: "ok",
        message: json.message || "Submitted for review.",
        slugs,
        newlyPublishedSlugs,
        alreadyPublishedSlugs,
        published,
      });
      setUrl("");
      // Refresh rewards after any successful submit (X / YouTube / GitHub).
      onPublished?.();
    } catch {
      setState({ status: "error", message: "Network error. Try again." });
    }
  }

  const loadingLabel =
    sourceType === "youtube"
      ? "Extracting GitHub repositories from description..."
      : sourceType === "x"
        ? "Extracting GitHub repositories..."
        : "Analyzing repository...";

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-secondary">{description}</p>
      <input
        required
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder={placeholder}
        className="mt-5 h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-accent"
      />
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email (optional, for follow-up)"
        className="mt-3 h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={state.status === "loading"}
        className="mt-4 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background disabled:opacity-60"
      >
        {state.status === "loading" ? loadingLabel : button}
      </button>
      {state.status === "ok" ? (
        <div className="mt-3 text-sm text-success">
          <p>{state.message}</p>
          <ProjectResultLinks title="Newly published" slugs={state.newlyPublishedSlugs} />
          <ProjectResultLinks title="Already on the site" slugs={state.alreadyPublishedSlugs} />
          {state.published &&
          !state.newlyPublishedSlugs.length &&
          !state.alreadyPublishedSlugs.length &&
          state.slugs.length === 1 ? (
            <Link href={`/projects/${state.slugs[0]}`} className="underline">
              View project
            </Link>
          ) : null}
          {state.published &&
          !state.newlyPublishedSlugs.length &&
          !state.alreadyPublishedSlugs.length &&
          state.slugs.length > 1 ? (
            <ul className="mt-2 space-y-1">
              {state.slugs.map((slug) => (
                <li key={slug}>
                  <Link href={`/projects/${slug}`} className="underline">
                    {slug}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {!state.published ? <p className="text-secondary">It is not published.</p> : null}
        </div>
      ) : null}
      {state.status === "error" ? <p className="mt-3 text-sm text-error">{state.message}</p> : null}
    </form>
  );
}

export default function SubmitPage() {
  const [rewardsRefreshKey, setRewardsRefreshKey] = useState(0);
  const bumpRewards = () => setRewardsRefreshKey((key) => key + 1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Submit an AI Project</h1>
      <div className="mt-10 grid gap-6">
        <SubmitForm
          title="Submit a GitHub Repository"
          description={
            <>
              <span className="text-accent">Licensed open source repos with at least 100 stars.</span> We
              validate the repo, generate an AI analyzed profile, and publish it.
            </>
          }
          placeholder="GitHub Repository URL"
          sourceType="github"
          button="Analyze & Submit"
          onPublished={bumpRewards}
        />
        <SubmitForm
          title="Found a great project on X?"
          description="Paste an X post URL. We extract every GitHub repository in the post and send each through the same pipeline."
          placeholder="X Post URL"
          sourceType="x"
          button="Analyze & Submit"
          onPublished={bumpRewards}
        />
        <SubmitForm
          title="Found projects on YouTube?"
          description="Paste a YouTube video URL. We extract every GitHub repository from the description and send each through the same pipeline."
          placeholder="YouTube Video URL"
          sourceType="youtube"
          button="Analyze & Submit"
          onPublished={bumpRewards}
        />
      </div>
      <p className="mt-10 text-center text-sm text-secondary">Anyone can contribute. 🙂</p>
      <RewardsClaimSection refreshKey={rewardsRefreshKey} />
    </div>
  );
}
