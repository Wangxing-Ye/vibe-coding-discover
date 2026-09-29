import { createPublicClient, createWalletClient, http, parseAbi, type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BASE_CHAIN_ID, baseChain, baseRpcUrl } from "./base-chain";

export const CLAIM_AMOUNT = BigInt(10_000) * BigInt(10) ** BigInt(18);
export const DAILY_GLOBAL_CAP = BigInt(100_000_000) * BigInt(10) ** BigInt(18);

export const claimAbi = parseAbi([
  "function claim(uint256 day, uint256 nonce, bytes signature)",
  "function CLAIM_AMOUNT() view returns (uint256)",
  "function DAILY_GLOBAL_CAP() view returns (uint256)",
  "function currentDay() view returns (uint256)",
  "function remainingToday() view returns (uint256)",
  "function hasClaimedToday(address wallet) view returns (bool)",
  "function paused() view returns (bool)",
  "function usedNonce(address wallet, uint256 nonce) view returns (bool)",
  "event Claimed(address indexed wallet, uint256 indexed day, uint256 amount, uint256 nonce)",
]);

export const claimDomain = {
  name: "VIBECDDailyClaim",
  version: "1",
} as const;

export const claimTypes = {
  Claim: [
    { name: "wallet", type: "address" },
    { name: "day", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "amount", type: "uint256" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
} as const;

export function utcDay(now = Date.now()) {
  return Math.floor(now / 86_400_000);
}

export function claimEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_VIBECD_CLAIM_ADDRESS &&
      process.env.CLAIM_SIGNER_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_VIBECD_TOKEN_ADDRESS,
  );
}

export function claimAddresses() {
  return {
    token: (process.env.NEXT_PUBLIC_VIBECD_TOKEN_ADDRESS || "") as Address,
    claim: (process.env.NEXT_PUBLIC_VIBECD_CLAIM_ADDRESS || "") as Address,
    rewards: (process.env.NEXT_PUBLIC_VIBECD_REWARDS_ADDRESS || "") as Address,
    chainId: Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID || BASE_CHAIN_ID),
  };
}

function rpcUrl() {
  return baseRpcUrl();
}

export function claimPublicClient() {
  return createPublicClient({
    chain: baseChain,
    transport: http(rpcUrl()),
  });
}

export async function hasClaimedDailyOnChain(wallet: Address) {
  const { claim } = claimAddresses();
  if (!claim) return false;
  try {
    return await claimPublicClient().readContract({
      address: claim,
      abi: claimAbi,
      functionName: "hasClaimedToday",
      args: [wallet],
    });
  } catch {
    return false;
  }
}

export async function isDailyNonceUsed(wallet: Address, nonce: bigint) {
  const { claim } = claimAddresses();
  if (!claim) return false;
  try {
    return await claimPublicClient().readContract({
      address: claim,
      abi: claimAbi,
      functionName: "usedNonce",
      args: [wallet, nonce],
    });
  } catch {
    return false;
  }
}

export async function signClaimTicket(options: {
  wallet: Address;
  day: number;
  nonce: bigint;
}) {
  const key = process.env.CLAIM_SIGNER_PRIVATE_KEY;
  if (!key) throw new Error("CLAIM_SIGNER_PRIVATE_KEY is not set");
  const normalized = (key.startsWith("0x") ? key : `0x${key}`) as Hex;
  const account = privateKeyToAccount(normalized);
  const { claim, chainId } = claimAddresses();
  if (!claim) throw new Error("NEXT_PUBLIC_VIBECD_CLAIM_ADDRESS is not set");

  const client = createWalletClient({
    account,
    chain: baseChain,
    transport: http(rpcUrl()),
  });

  const signature = await client.signTypedData({
    account,
    domain: {
      ...claimDomain,
      chainId,
      verifyingContract: claim,
    },
    types: claimTypes,
    primaryType: "Claim",
    message: {
      wallet: options.wallet,
      day: BigInt(options.day),
      nonce: options.nonce,
      amount: CLAIM_AMOUNT,
      chainId: BigInt(chainId),
      verifyingContract: claim,
    },
  });

  return { signature, signer: account.address };
}
