"use client";

import { useCallback, useState } from "react";
import { basescanTokenUrl } from "@/lib/base-chain";

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function CopyableTokenAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [address]);

  return (
    <div className="mx-auto mt-1 max-w-xl text-center">
      <div className="flex items-center justify-center gap-1.5 px-2">
        <a
          href={basescanTokenUrl(address)}
          target="_blank"
          rel="noreferrer"
          className="break-all font-mono text-sm leading-6 text-secondary hover:text-foreground hover:underline"
        >
          {address}
        </a>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-secondary transition-colors hover:bg-[#f4f4f5] hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          aria-label={copied ? "Token address copied" : "Copy token address"}
          title={copied ? "Copied" : "Copy"}
        >
          <CopyIcon />
        </button>
      </div>
      {copied ? <p className="mt-1 text-xs text-success">Copied</p> : null}
    </div>
  );
}
