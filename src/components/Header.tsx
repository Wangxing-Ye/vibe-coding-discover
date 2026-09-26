import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { SITE_NAME } from "@/lib/site";

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/android-chrome-192x192.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
          {SITE_NAME}
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function GitHubLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-10 text-sm text-secondary sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>The AI discovery layer for AI open source</p>
          <p>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms & Privacy
            </Link>
          </p>
          <p>Discover open source that speeds up vibe coding.</p>
        </div>
        <div className="mt-6 flex items-center justify-end gap-4">
          <a
            href="https://x.com/wilsonye2025"
            target="_blank"
            rel="noreferrer"
            aria-label="X (Twitter)"
            className="text-secondary transition-colors hover:text-foreground"
          >
            <XLogo className="h-5 w-5" />
          </a>
          <a
            href="https://github.com/Wangxing-Ye/vibe-coding-discover"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="text-secondary transition-colors hover:text-foreground"
          >
            <GitHubLogo className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
