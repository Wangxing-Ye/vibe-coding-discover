import { base } from "viem/chains";

/** Base mainnet. Used for deploy, EIP-712 tickets, and wagmi. */
export const baseChain = base;
export const BASE_CHAIN_ID = base.id;
export const BASE_RPC_FALLBACK = "https://mainnet.base.org";
export const BASESCAN_ORIGIN = "https://basescan.org";

export function baseRpcUrl() {
  return process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || BASE_RPC_FALLBACK;
}

export function basescanTokenUrl(tokenAddress: string) {
  return `${BASESCAN_ORIGIN}/token/${tokenAddress}`;
}

export function basescanAddressUrl(address: string) {
  return `${BASESCAN_ORIGIN}/address/${address}`;
}
