"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { metaMask, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { base } from "wagmi/chains";
import { BASE_RPC_FALLBACK } from "@/lib/base-chain";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "vibecodingdiscover-local";

const connectors = [
  metaMask({ dappMetadata: { name: "Vibe Coding Discover" } }),
  coinbaseWallet({ appName: "Vibe Coding Discover" }),
  // EIP-6963 discovery (Trust, OKX, Phantom, etc.) is enabled below — no generic "Injected".
  ...(projectId && projectId !== "vibecodingdiscover-local"
    ? [
        walletConnect({
          projectId,
          metadata: {
            name: "Vibe Coding Discover",
            description: "Claim VIBECD on Base",
            url: "https://vibecodingdiscover.local",
            icons: [],
          },
          showQrModal: true,
        }),
      ]
    : []),
];

const config = createConfig({
  connectors,
  chains: [base],
  multiInjectedProviderDiscovery: true,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || BASE_RPC_FALLBACK),
  },
  ssr: true,
});

export function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
