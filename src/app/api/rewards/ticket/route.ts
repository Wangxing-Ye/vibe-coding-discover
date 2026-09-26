import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress, type Address } from "viem";
import { prisma } from "@/lib/db";
import { claimAddresses } from "@/lib/claim";
import { clientIp } from "@/lib/client-ip";
import {
  isRewardsNonceUsed,
  MAX_REWARDS_PER_IP_PER_DAY,
  REWARD_AMOUNT,
  rewardsEnabled,
  signRewardTicket,
  utcDay,
} from "@/lib/rewards";

export const dynamic = "force-dynamic";

async function markNonceClaimed(wallet: Address, nonce: string) {
  return prisma.submissionReward.updateMany({
    where: {
      claimWallet: wallet,
      nonce,
      status: "issued",
    },
    data: {
      status: "claimed",
      claimedAt: new Date(),
    },
  });
}

/** If an issued batch was already paid on-chain, mark it claimed in DB. */
async function syncIssuedBatchesWithChain(
  rows: { id: string; status: string; nonce: string | null; claimWallet: string | null }[],
) {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.status !== "issued" || !row.nonce || !row.claimWallet) continue;
    const key = `${row.claimWallet.toLowerCase()}:${row.nonce}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const wallet = getAddress(row.claimWallet);
    if (await isRewardsNonceUsed(wallet, BigInt(row.nonce))) {
      await markNonceClaimed(wallet, row.nonce);
    }
  }
}

export async function GET(request: NextRequest) {
  const ip = clientIp(request);
  const day = utcDay();
  const { rewards, token, chainId } = claimAddresses();

  const open = await prisma.submissionReward.findMany({
    where: {
      ip,
      status: { in: ["pending", "issued"] },
    },
    orderBy: { createdAt: "asc" },
  });

  // Hide already-paid batches from Pending (e.g. confirm API never ran).
  await syncIssuedBatchesWithChain(open);

  const pending = await prisma.submissionReward.findMany({
    where: {
      ip,
      status: { in: ["pending", "issued"] },
    },
    orderBy: { createdAt: "asc" },
  });

  const grantedToday = await prisma.submissionReward.count({
    where: { ip, day },
  });

  return NextResponse.json({
    enabled: rewardsEnabled(),
    rewards: rewards || null,
    token: token || null,
    chainId,
    rewardAmount: 20_000,
    maxPerIpPerDay: MAX_REWARDS_PER_IP_PER_DAY,
    pendingCount: pending.length,
    pendingAmount: pending.length * 20_000,
    grantedToday,
    remainingToday: Math.max(0, MAX_REWARDS_PER_IP_PER_DAY - grantedToday),
  });
}

export async function POST(request: NextRequest) {
  if (!rewardsEnabled()) {
    return NextResponse.json(
      { error: "Rewards claim is not configured. Deploy contracts and set env vars." },
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
  const { rewards, token, chainId } = claimAddresses();

  const open = await prisma.submissionReward.findMany({
    where: {
      ip,
      status: { in: ["pending", "issued"] },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!open.length) {
    return NextResponse.json({ error: "No pending submission rewards for this IP." }, { status: 404 });
  }

  // Critical: never mint a second nonce for a batch already paid on-chain.
  await syncIssuedBatchesWithChain(open);

  const rows = await prisma.submissionReward.findMany({
    where: {
      ip,
      status: { in: ["pending", "issued"] },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!rows.length) {
    return NextResponse.json({ error: "These rewards were already claimed on-chain." }, { status: 409 });
  }

  const issuedForWallet = rows.filter(
    (row) => row.status === "issued" && row.nonce && row.claimWallet === wallet,
  );
  const issuedOther = rows.filter(
    (row) => row.status === "issued" && row.nonce && row.claimWallet && row.claimWallet !== wallet,
  );

  if (issuedOther.length) {
    return NextResponse.json(
      { error: "Rewards were already issued to another wallet. Finish or wait for that claim." },
      { status: 409 },
    );
  }

  // Re-use the open unused nonce for this wallet (covers retries + newly pending rows).
  if (issuedForWallet[0]?.nonce) {
    const nonce = BigInt(issuedForWallet[0].nonce);
    if (!(await isRewardsNonceUsed(wallet, nonce))) {
      const ids = rows.map((row) => row.id);
      await prisma.submissionReward.updateMany({
        where: { id: { in: ids } },
        data: {
          status: "issued",
          nonce: nonce.toString(),
          claimWallet: wallet,
          issuedAt: issuedForWallet[0].issuedAt ?? new Date(),
        },
      });
      const amount = REWARD_AMOUNT * BigInt(ids.length);
      try {
        const { signature, signer } = await signRewardTicket({ wallet, day, nonce, amount });
        return NextResponse.json({
          wallet,
          day,
          nonce: nonce.toString(),
          amount: (ids.length * 20_000).toString(),
          rewardIds: ids,
          count: ids.length,
          signature,
          rewards,
          token,
          chainId,
          signer,
          reissued: true,
        });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to reissue rewards ticket" },
          { status: 500 },
        );
      }
    }

    // Race: became used between sync and now — mark claimed and stop.
    await markNonceClaimed(wallet, issuedForWallet[0].nonce);
    return NextResponse.json({ error: "These rewards were already claimed on-chain." }, { status: 409 });
  }

  // Fresh ticket: only rows still pending (atomic) so two parallel POSTs cannot double-sign.
  const pendingIds = rows.filter((row) => row.status === "pending").map((row) => row.id);
  if (!pendingIds.length) {
    return NextResponse.json({ error: "No pending submission rewards for this IP." }, { status: 404 });
  }

  const nonce = BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));
  const updated = await prisma.submissionReward.updateMany({
    where: {
      id: { in: pendingIds },
      status: "pending",
    },
    data: {
      status: "issued",
      nonce: nonce.toString(),
      claimWallet: wallet,
      issuedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    // Another request issued first — reload and reissue that nonce.
    const again = await prisma.submissionReward.findMany({
      where: { ip, status: "issued", claimWallet: wallet },
      orderBy: { createdAt: "asc" },
    });
    if (again[0]?.nonce && !(await isRewardsNonceUsed(wallet, BigInt(again[0].nonce)))) {
      const amount = REWARD_AMOUNT * BigInt(again.length);
      const { signature, signer } = await signRewardTicket({
        wallet,
        day,
        nonce: BigInt(again[0].nonce),
        amount,
      });
      return NextResponse.json({
        wallet,
        day,
        nonce: again[0].nonce,
        amount: (again.length * 20_000).toString(),
        rewardIds: again.map((row) => row.id),
        count: again.length,
        signature,
        rewards,
        token,
        chainId,
        signer,
        reissued: true,
      });
    }
    return NextResponse.json({ error: "Could not issue rewards ticket. Try again." }, { status: 409 });
  }

  // Only sign for rows we actually locked (partial race → smaller batch).
  const locked = await prisma.submissionReward.findMany({
    where: {
      id: { in: pendingIds },
      status: "issued",
      nonce: nonce.toString(),
      claimWallet: wallet,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!locked.length) {
    return NextResponse.json({ error: "Could not issue rewards ticket. Try again." }, { status: 409 });
  }

  const amount = REWARD_AMOUNT * BigInt(locked.length);

  try {
    const { signature, signer } = await signRewardTicket({ wallet, day, nonce, amount });
    return NextResponse.json({
      wallet,
      day,
      nonce: nonce.toString(),
      amount: (locked.length * 20_000).toString(),
      rewardIds: locked.map((row) => row.id),
      count: locked.length,
      signature,
      rewards,
      token,
      chainId,
      signer,
    });
  } catch (error) {
    // Roll back lock so user can retry.
    await prisma.submissionReward.updateMany({
      where: {
        id: { in: locked.map((row) => row.id) },
        nonce: nonce.toString(),
        status: "issued",
      },
      data: {
        status: "pending",
        nonce: null,
        claimWallet: null,
        issuedAt: null,
      },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to issue rewards ticket" },
      { status: 500 },
    );
  }
}
