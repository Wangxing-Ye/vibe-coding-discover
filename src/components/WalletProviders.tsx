"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { metaMask, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { baseSepolia } from "wagmi/chains";

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
            description: "Claim VIBECD on Base Sepolia",
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
  chains: [baseSepolia],
  multiInjectedProviderDiscovery: true,
  transports: {
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://base-sepolia-rpc.publicnode.com",
    ),
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
