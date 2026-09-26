import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { prisma } from "@/lib/db";
import { isRewardsNonceUsed } from "@/lib/rewards";

export const dynamic = "force-dynamic";

/** Mark issued rewards as claimed after a successful on-chain rewards claim. */
export async function POST(request: NextRequest) {
  let body: { wallet?: string; nonce?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.wallet || !isAddress(body.wallet) || !body.nonce) {
    return NextResponse.json({ error: "wallet and nonce required" }, { status: 400 });
  }

  const wallet = getAddress(body.wallet);
  const nonce = BigInt(body.nonce);
  if (!(await isRewardsNonceUsed(wallet, nonce))) {
    return NextResponse.json({ error: "On-chain claim not found for this nonce yet." }, { status: 409 });
  }

  const result = await prisma.submissionReward.updateMany({
    where: {
      claimWallet: wallet,
      nonce: body.nonce,
      status: "issued",
    },
    data: {
      status: "claimed",
      claimedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
