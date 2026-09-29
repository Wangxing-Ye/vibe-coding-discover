import { createPublicClient, createWalletClient, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseChain, baseRpcUrl } from "./base-chain";
import { claimAddresses, utcDay } from "./claim";

export const REWARD_AMOUNT = BigInt(20_000) * BigInt(10) ** BigInt(18);
export const MAX_REWARDS_PER_IP_PER_DAY = 10;

export const rewardsAbi = parseAbi([
  "function claim(uint256 day, uint256 nonce, uint256 amount, bytes signature)",
  "function REWARD_AMOUNT() view returns (uint256)",
  "function usedNonce(address wallet, uint256 nonce) view returns (bool)",
  "function paused() view returns (bool)",
  "event RewardClaimed(address indexed wallet, uint256 indexed day, uint256 amount, uint256 nonce)",
]);

export const rewardsDomain = {
  name: "VIBECDRewardsClaim",
  version: "1",
} as const;

export const rewardsTypes = {
  RewardClaim: [
    { name: "wallet", type: "address" },
    { name: "day", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "amount", type: "uint256" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
} as const;

export function rewardsEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_VIBECD_REWARDS_ADDRESS &&
      process.env.CLAIM_SIGNER_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_VIBECD_TOKEN_ADDRESS,
  );
}

function rpcUrl() {
  return baseRpcUrl();
}

export function rewardsPublicClient() {
  return createPublicClient({
    chain: baseChain,
    transport: http(rpcUrl()),
  });
}

export async function isRewardsNonceUsed(wallet: Address, nonce: bigint) {
  const { rewards } = claimAddresses();
  if (!rewards) return false;
  try {
    return await rewardsPublicClient().readContract({
      address: rewards,
      abi: rewardsAbi,
      functionName: "usedNonce",
      args: [wallet, nonce],
    });
  } catch {
    return false;
  }
}

export async function signRewardTicket(options: {
  wallet: Address;
  day: number;
  nonce: bigint;
  amount: bigint;
}) {
  const key = process.env.CLAIM_SIGNER_PRIVATE_KEY;
  if (!key) throw new Error("CLAIM_SIGNER_PRIVATE_KEY is not set");
  const normalized = (key.startsWith("0x") ? key : `0x${key}`) as Hex;
  const account = privateKeyToAccount(normalized);
  const { rewards, chainId } = claimAddresses();
  if (!rewards) throw new Error("NEXT_PUBLIC_VIBECD_REWARDS_ADDRESS is not set");

  const client = createWalletClient({
    account,
    chain: baseChain,
    transport: http(rpcUrl()),
  });

  const signature = await client.signTypedData({
    account,
    domain: {
      ...rewardsDomain,
      chainId,
      verifyingContract: rewards,
    },
    types: rewardsTypes,
    primaryType: "RewardClaim",
    message: {
      wallet: options.wallet,
      day: BigInt(options.day),
      nonce: options.nonce,
      amount: options.amount,
      chainId: BigInt(chainId),
      verifyingContract: rewards,
    },
  });

  return { signature, signer: account.address };
}

export { utcDay };
