import type { Metadata } from "next";
import Link from "next/link";
import { VibecdTermsContent } from "@/components/VibecdTermsContent";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Privacy",
  description: `Terms of Use and Privacy Policy for ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Terms & Privacy</h1>
      <p className="mt-3 text-sm text-secondary">Last updated: September 29, 2026</p>
      <p className="mt-6 text-[15px] leading-7 text-secondary">
        These Terms of Use and this Privacy Policy apply to {SITE_NAME} (the “Service”). By using the
        Service—including browsing project pages, submitting a repository, X post, or YouTube video,
        or claiming VIBECD—you agree to these terms.
      </p>

      <nav className="mt-8 flex flex-wrap gap-4 text-sm">
        <a href="#terms" className="text-accent hover:underline">
          Terms of Use
        </a>
        <a href="#vibecd" className="text-accent hover:underline">
          VIBECD
        </a>
        <a href="#privacy" className="text-accent hover:underline">
          Privacy Policy
        </a>
      </nav>

      <section id="terms" className="mt-12 scroll-mt-8">
        <h2 className="text-xl font-semibold tracking-tight">Terms of Use</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-7 text-secondary">
          <div>
            <h3 className="font-medium text-foreground">1. What the Service is</h3>
            <p className="mt-2">
              {SITE_NAME} is an AI-native discovery layer for open source. We index public GitHub
              repositories, generate short AI profiles, and help visitors find projects related to
              agents, MCP, skills, RAG, tools, and frameworks. We do not host your application code
              or replace GitHub.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">2. Submissions</h3>
            <p className="mt-2">
              You may submit a public GitHub repository URL, an X post URL, or a YouTube video URL that
              contains GitHub links. You represent that you are allowed to submit that content and that
              it does not violate applicable law or third-party rights. We may reject, delay, edit, or
              remove listings at our discretion (for example: missing license, too few stars, out of
              scope, or failed analysis).
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">3. Third-party content</h3>
            <p className="mt-2">
              Project names, descriptions, stars, licenses, and other metadata come from public
              sources such as GitHub. Ownership and licensing remain with the original authors. We do
              not claim ownership of those repositories and do not guarantee that metadata is
              complete, current, or accurate.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">4. AI-generated summaries</h3>
            <p className="mt-2">
              Profiles, tags, categories, and use cases may be generated or assisted by AI. They can
              contain errors or omissions. Treat them as starting points—always verify important
              details on the original GitHub repository.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">5. Acceptable use</h3>
            <p className="mt-2">
              Do not abuse the Service: no spam submissions, no attempts to disrupt the site or its
              pipelines, and no use that violates law or GitHub / X / YouTube terms. We may rate-limit
              or block abusive traffic.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">6. Disclaimer</h3>
            <p className="mt-2">
              The Service is provided “as is” without warranties of any kind. We are not liable for
              decisions you make based on listings or AI summaries, or for downtime, data loss, or
              third-party service changes. Listing a project is not an endorsement.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">7. Changes</h3>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the Service after changes
              means you accept the updated terms. The “Last updated” date at the top will change when
              we revise this page.
            </p>
          </div>
        </div>
      </section>

      <section id="vibecd" className="mt-14 scroll-mt-8">
        <h2 className="text-xl font-semibold tracking-tight">VIBECD</h2>
        <VibecdTermsContent />
      </section>

      <section id="privacy" className="mt-14 scroll-mt-8">
        <h2 className="text-xl font-semibold tracking-tight">Privacy Policy</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-7 text-secondary">
          <div>
            <h3 className="font-medium text-foreground">1. Information we collect</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="text-foreground">Submission data:</span> GitHub, X, or YouTube URLs
                you submit, and an optional email if you provide one for follow-up.
              </li>
              <li>
                <span className="text-foreground">Public project data:</span> metadata fetched from
                GitHub (and related public sources) to build listings.
              </li>
              <li>
                <span className="text-foreground">Claim data:</span> wallet address you use to claim
                VIBECD, and IP address used to enforce the once-per-IP-per-UTC-day limit.
              </li>
              <li>
                <span className="text-foreground">Usage & diagnostics:</span> basic server logs and,
                if configured, product analytics (e.g. PostHog) and error monitoring (e.g. Sentry).
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground">2. How we use information</h3>
            <p className="mt-2">
              We use this information to operate the catalog, process submissions, run the VIBECD
              claim flow (including abuse prevention), improve discovery quality, secure the Service,
              and—only if you left an email—contact you about a submission when needed. We do not sell
              your personal information.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">3. Cookies and similar technologies</h3>
            <p className="mt-2">
              We may use cookies or local storage for essential site functions (including admin
              session cookies) and, when analytics tools are enabled, for measuring usage. You can
              control cookies through your browser settings.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">4. Third-party services</h3>
            <p className="mt-2">
              Processing may involve GitHub, X, YouTube, AI providers used for analysis,
              hosting/database providers, blockchain networks and wallet software for VIBECD claims,
              and optional analytics or error-tracking vendors. Their own terms and privacy policies
              apply to their processing.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">5. Data retention</h3>
            <p className="mt-2">
              We keep project listings and related analysis while they remain useful for the Service.
              Submission records and optional emails are retained as needed to operate review
              workflows and respond to requests, then deleted or anonymized when no longer needed.
              Claim ticket records (wallet / IP / day) are retained as needed to enforce daily limits
              and investigate abuse.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">6. Contact</h3>
            <p className="mt-2">
              Questions about these terms or your data: reach us on{" "}
              <a
                href="https://x.com/wilsonye2025"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                X
              </a>{" "}
              or via the{" "}
              <a
                href="https://github.com/Wangxing-Ye/vibe-coding-discover"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                GitHub repository
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <p className="mt-14 text-sm text-secondary">
        <Link href="/" className="text-accent hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
