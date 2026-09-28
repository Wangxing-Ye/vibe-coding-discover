"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { rewardsAbi } from "@/lib/rewards";
import { buildWalletMenuRows, formatWalletError, type WalletMenuRow } from "@/lib/wallet-menu";

type RewardsStatus = {
  enabled?: boolean;
  pendingCount?: number;
  pendingAmount?: number;
  grantedToday?: number;
  remainingToday?: number;
  rewards?: `0x${string}` | null;
};

type TicketResponse = {
  error?: string;
  day?: number;
  nonce?: string;
  amount?: string;
  signature?: `0x${string}`;
  rewards?: `0x${string}`;
  count?: number;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function RewardsClaimSection({ refreshKey = 0 }: { refreshKey?: number }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<RewardsStatus | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ wallet: string; nonce: string } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const rewardsAddress = process.env.NEXT_PUBLIC_VIBECD_REWARDS_ADDRESS as `0x${string}` | undefined;
  const tokenAddress = process.env.NEXT_PUBLIC_VIBECD_TOKEN_ADDRESS as `0x${string}` | undefined;
  const configured = Boolean(rewardsAddress && tokenAddress);
  const tokenTxUrl = `https://sepolia.basescan.org/token/${tokenAddress ?? "0xe73d12aacb133a316cd4b97318b3c83561e659e0"}#transactions`;

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards/ticket");
      const json = (await res.json()) as RewardsStatus;
      setStatus(json);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus, isSuccess, refreshKey]);

  useEffect(() => {
    if (!isSuccess || !pendingConfirm) return;
    const { wallet, nonce } = pendingConfirm;
    void (async () => {
      try {
        await fetch("/api/rewards/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet, nonce }),
        });
        await refreshStatus();
      } finally {
        setPendingConfirm(null);
      }
    })();
  }, [isSuccess, pendingConfirm, refreshStatus]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (pickerRef.current && target && !pickerRef.current.contains(target)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [pickerOpen]);

  const menuRows = useMemo(() => buildWalletMenuRows(connectors), [connectors]);

  const onClaim = useCallback(async () => {
    setError(null);
    if (!configured || !rewardsAddress) {
      setError("Rewards contracts are not configured yet.");
      return;
    }
    if (!address) {
      setError("Connect a wallet first.");
      return;
    }
    setBusy(true);
    try {
      if (chainId !== baseSepolia.id) {
        await switchChainAsync({ chainId: baseSepolia.id });
      }
      const res = await fetch("/api/rewards/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const json = (await res.json()) as TicketResponse;
      if (!res.ok || !json.signature || json.day == null || !json.nonce || !json.amount) {
        throw new Error(json.error || "Could not get rewards ticket");
      }

      await writeContractAsync({
        address: rewardsAddress,
        abi: rewardsAbi,
        functionName: "claim",
        args: [BigInt(json.day), BigInt(json.nonce), BigInt(json.amount) * BigInt(10) ** BigInt(18), json.signature],
        chainId: baseSepolia.id,
      });
      setPendingConfirm({ wallet: address, nonce: json.nonce });
    } catch (err) {
      setError(formatWalletError(err, "Rewards claim failed"));
    } finally {
      setBusy(false);
    }
  }, [address, chainId, configured, rewardsAddress, switchChainAsync, writeContractAsync]);

  const selectWallet = useCallback(
    async (row: WalletMenuRow) => {
      setError(null);
      if (row.connector) {
        try {
          await connectAsync({ connector: row.connector, chainId: baseSepolia.id });
          setPickerOpen(false);
        } catch (err) {
          setError(formatWalletError(err, "Could not connect wallet"));
        }
        return;
      }
      if (row.installUrl) {
        window.open(row.installUrl, "_blank", "noopener,noreferrer");
        setError(`Install ${row.label}, then return here to connect.`);
        return;
      }
      setError(`${row.label} is not available in this browser.`);
    },
    [connectAsync],
  );

  const pendingAmount = status?.pendingAmount ?? 0;
  const pendingCount = status?.pendingCount ?? 0;

  return (
    <section className="mt-10 rounded-2xl border border-border px-6 py-8 text-center">
      <h2 className="text-lg font-semibold tracking-tight">Rewards Claim</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary">
        <a href={tokenTxUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          VIBECD
        </a>{" "}
        is a commemorative memecoin celebrating vibe coding on the Base network.
        <br />
        Claiming does not imply investment value or future returns.
        <br />
        Claiming VIBECD is free. You pay the network gas fee for the on-chain transaction.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary">
        20,000 VIBECD rewards for each successful published submission.
        <br />
        Daily rewards are limited to 10 submissions once per wallet once per IP per day.
      </p>
      <p className="mt-3 text-sm text-secondary">
        Pending: <span className="text-foreground">{pendingAmount.toLocaleString()} VIBECD</span>
        {status?.grantedToday != null ? (
          <>
            {" "}
            · Granted today:{" "}
            <span className={status.grantedToday >= 10 ? "text-error" : undefined}>
              {status.grantedToday}/{10}
            </span>
          </>
        ) : null}
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={
            !isConnected ||
            busy ||
            isWriting ||
            isConfirming ||
            !configured ||
            pendingCount < 1 ||
            isSuccess
          }
          onClick={onClaim}
          className="inline-flex h-11 cursor-pointer items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSuccess
            ? "Rewards claimed"
            : busy || isWriting || isConfirming
              ? "Claiming…"
              : pendingCount > 0
                ? `Claim ${pendingAmount.toLocaleString()} VIBECD`
                : "No pending rewards"}
        </button>
        {isConnected && address ? <span className="text-sm text-secondary">{shortAddress(address)}</span> : null}
        {isConnected ? (
          <button
            type="button"
            onClick={() => disconnect()}
            className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border px-4 text-sm hover:border-foreground"
          >
            Disconnect Wallet
          </button>
        ) : (
          <div ref={pickerRef} className="relative flex w-full max-w-xs flex-col items-center gap-2">
            <button
              type="button"
              disabled={isConnecting}
              onClick={() => setPickerOpen((open) => !open)}
              className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border px-5 text-sm font-medium hover:border-foreground"
            >
              Connect Wallet
            </button>
            {pickerOpen ? (
              <div className="w-full rounded-xl border border-border bg-background p-2 text-left shadow-sm">
                {menuRows.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    disabled={isConnecting}
                    onClick={() => void selectWallet(row)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-[#f4f4f5]"
                  >
                    <span>{row.label}</span>
                    {!row.connector ? <span className="text-xs text-secondary">Install</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {!configured ? (
        <p className="mt-4 text-sm text-warning">
          Deploy rewards contract and set NEXT_PUBLIC_VIBECD_REWARDS_ADDRESS to enable claims.
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
    </section>
  );
}
