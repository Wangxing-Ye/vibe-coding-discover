import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { basescanAddressUrl, basescanTokenUrl } from "@/lib/base-chain";
import { claimAddresses } from "@/lib/claim";

export const metadata: Metadata = {
  title: "Terms & Privacy",
  description: `Terms of Use and Privacy Policy for ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const fromEnv = claimAddresses();
  const token = fromEnv.token || "0x848fa60cc5652d38c8ab61700964d8ba6682dae1";
  const claim = fromEnv.claim || "0xfef6a0f15e3783540df1f58f4bcd7a7e28751ec6";
  const rewards = fromEnv.rewards || "0x11bde142c37f76b41ff3b2bf5db96f552d427578";

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
        <div className="mt-4 space-y-4 text-[15px] leading-7 text-secondary">
          <p>
            VIBECD is a commemorative memecoin celebrating vibe coding. It is offered on the Base
            network.
          </p>
          <table className="w-full max-w-xl border-collapse text-left text-sm text-secondary">
            <tbody>
              <tr>
                <th className="py-1.5 pr-4 text-right font-normal text-foreground">Fixed Supply: </th>
                <td className="py-1.5">10,000,000,000</td>
              </tr>
              <tr>
                <th className="py-1.5 pr-4 text-right font-normal text-foreground">Community supply: </th>
                <td className="py-1.5">80% reserved for daily claim, 20% for rewards claim</td>
              </tr>
              <tr>
                <th className="py-1.5 pr-4 text-right font-normal text-foreground">Daily claim cap: </th>
                <td className="py-1.5">10,000 VIBECD once per wallet once per IP per day.</td>
              </tr>
              <tr>
                <th className="py-1.5 pr-4 text-right font-normal text-foreground">Rewards claim cap: </th>
                <td className="py-1.5">Up to 200,000 VIBECD once per wallet once per IP per day.</td>
              </tr>
              <tr>
                <th className="py-1.5 pr-4 text-right font-normal text-foreground">Global daily cap: </th>
                <td className="py-1.5">100,000,000 VIBECD (daily claim vault).</td>
              </tr>
              {token ? (
                <tr>
                  <th className="py-1.5 pr-4 align-top text-right font-normal text-foreground">Token: </th>
                  <td className="py-1.5 break-all">
                    <a
                      href={basescanTokenUrl(token)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {token}
                    </a>
                  </td>
                </tr>
              ) : null}
              {claim ? (
                <tr>
                  <th className="py-1.5 pr-4 align-top text-right font-normal text-foreground">Daily claim: </th>
                  <td className="py-1.5 break-all">
                    <a
                      href={basescanAddressUrl(claim)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {claim}
                    </a>
                  </td>
                </tr>
              ) : null}
              {rewards ? (
                <tr>
                  <th className="py-1.5 pr-4 align-top text-right font-normal text-foreground">Rewards claim: </th>
                  <td className="py-1.5 break-all">
                    <a
                      href={basescanAddressUrl(rewards)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {rewards}
                    </a>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <p>Days are measured in UTC.</p>
          <p>
            Claims require connecting a compatible wallet and completing an on-chain transaction.
            Claiming VIBECD is free. You pay the network gas fee for the on-chain transaction; we do
            not charge a claim fee. We may refuse, pause, or change claim availability for
            operational, security, or abuse reasons. Smart contracts and network conditions can
            fail; claimed tokens may be lost or unusable if you interact incorrectly.
          </p>
          <p className="text-foreground">
            This is not financial advice. Claiming does not imply investment value or future returns.
            VIBECD is not an offer of securities, an investment product, or a guarantee of any
            economic benefit.
          </p>
        </div>
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
