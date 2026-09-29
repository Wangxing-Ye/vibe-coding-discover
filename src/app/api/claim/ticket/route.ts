import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { prisma } from "@/lib/db";
import {
  claimAddresses,
  claimEnabled,
  hasClaimedDailyOnChain,
  isDailyNonceUsed,
  signClaimTicket,
  utcDay,
} from "@/lib/claim";
import { clientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!claimEnabled()) {
    return NextResponse.json(
      { error: "Claim is not configured. Deploy contracts and set env vars." },
      { status: 503 },
    );
  }

  let body: { wallet?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.wallet || !isAddress(body.wallet)) {
    return NextResponse.json({ error: "Valid wallet address required" }, { status: 400 });
  }

  const wallet = getAddress(body.wallet);
  const ip = clientIp(request);
  const day = utcDay();
  const { claim, chainId, token } = claimAddresses();

  if (await hasClaimedDailyOnChain(wallet)) {
    return NextResponse.json({ error: "This wallet has already claimed today." }, { status: 429 });
  }

  const existing = await prisma.claimIpDay.findUnique({
    where: { ip_day: { ip, day } },
  });

  // Re-issue ticket when the same wallet already got a ticket but on-chain claim did not succeed.
  if (existing) {
    const existingWallet = existing.wallet ? getAddress(existing.wallet) : null;
    if (!existingWallet || existingWallet !== wallet) {
      return NextResponse.json(
        { error: "This IP has already requested a claim ticket today." },
        { status: 429 },
      );
    }

    const nonce = BigInt(existing.nonce);
    if (await isDailyNonceUsed(wallet, nonce)) {
      return NextResponse.json({ error: "This wallet has already claimed today." }, { status: 429 });
    }

    try {
      const { signature, signer } = await signClaimTicket({ wallet, day, nonce });
      return NextResponse.json({
        wallet,
        day,
        nonce: nonce.toString(),
        amount: "10000",
        signature,
        claim,
        token,
        chainId,
        signer,
        reissued: true,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to reissue claim ticket" },
        { status: 500 },
      );
    }
  }

  const nonce = BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));

  try {
    const { signature, signer } = await signClaimTicket({ wallet, day, nonce });
    await prisma.claimIpDay.create({
      data: {
        ip,
        day,
        wallet,
        nonce: nonce.toString(),
      },
    });

    return NextResponse.json({
      wallet,
      day,
      nonce: nonce.toString(),
      amount: "10000",
      signature,
      claim,
      token,
      chainId,
      signer,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to issue claim ticket" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const { claim, token, chainId, rewards } = claimAddresses();
  return NextResponse.json({
    enabled: claimEnabled(),
    claim: claim || null,
    rewards: rewards || null,
    token: token || null,
    chainId,
    claimAmount: 10_000,
    dailyGlobalCap: 100_000_000,
    network: chainId === 8453 ? "Base" : `chain ${chainId}`,
  });
}
