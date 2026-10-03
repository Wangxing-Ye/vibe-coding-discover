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
import { base } from "wagmi/chains";
import Link from "next/link";
import { claimAbi } from "@/lib/claim";
import { buildWalletMenuRows, formatWalletError, type WalletMenuRow } from "@/lib/wallet-menu";

type TicketResponse = {
  error?: string;
  day?: number;
  nonce?: string;
  signature?: `0x${string}`;
  claim?: `0x${string}`;
  chainId?: number;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function ClaimSection() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const claimAddress = process.env.NEXT_PUBLIC_VIBECD_CLAIM_ADDRESS as `0x${string}` | undefined;
  const tokenFromEnv = process.env.NEXT_PUBLIC_VIBECD_TOKEN_ADDRESS as `0x${string}` | undefined;
  const configured = Boolean(claimAddress && tokenFromEnv);

  const menuRows = useMemo(() => buildWalletMenuRows(connectors), [connectors]);

  const status = useMemo(() => {
    if (isSuccess) return "Claimed 10,000 VIBECD on Base.";
    if (isConfirming) return "Confirming transaction…";
    if (isWriting || busy) return "Check your wallet…";
    if (isConnecting) return "Connecting wallet…";
    return null;
  }, [busy, isConfirming, isConnecting, isSuccess, isWriting]);

  useEffect(() => {
    if (!pickerOpen) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (pickerRef.current && target && !pickerRef.current.contains(target)) {
        setPickerOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPickerOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);

  const selectWallet = useCallback(
    async (row: WalletMenuRow) => {
      setError(null);
      if (row.connector) {
        try {
          await connectAsync({ connector: row.connector, chainId: base.id });
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

  const onClaim = useCallback(async () => {
    setError(null);
    if (!configured || !claimAddress) {
      setError("Claim contracts are not configured yet.");
      return;
    }
    if (!address) {
      setError("Connect a wallet first.");
      return;
    }
    setBusy(true);
    try {
      if (chainId !== base.id) {
        await switchChainAsync({ chainId: base.id });
      }

      const res = await fetch("/api/claim/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const json = (await res.json()) as TicketResponse;
      if (!res.ok || !json.signature || json.day == null || !json.nonce) {
        throw new Error(json.error || "Could not get claim ticket");
      }

      await writeContractAsync({
        address: claimAddress,
        abi: claimAbi,
        functionName: "claim",
        args: [BigInt(json.day), BigInt(json.nonce), json.signature],
        chainId: base.id,
      });
    } catch (err) {
      setError(formatWalletError(err, "Claim failed"));
    } finally {
      setBusy(false);
    }
  }, [address, chainId, claimAddress, configured, switchChainAsync, writeContractAsync]);

  return (
    <section id="daily-claim" className="mt-20 scroll-mt-8 rounded-2xl border border-border px-6 py-10 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Daily Claim</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary">
        <Link href="/vibecd" className="text-blue-600 hover:underline">
          VIBECD
        </Link>{" "}
        is a commemorative memecoin celebrating vibe coding on the Base network.
        <br />
        Claiming does not imply investment value or future returns.
        <br />
        Claiming VIBECD is free. You pay the network gas fee for the on-chain transaction.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary">
        10,000 VIBECD once per wallet once per IP per day.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/vibecd" className="text-accent hover:underline">
          What is VIBECD?
        </Link>
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={!isConnected || busy || isWriting || isConfirming || isSuccess || !configured}
          onClick={onClaim}
          className="inline-flex h-11 cursor-pointer items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-50"
        >
          {isSuccess ? "Claimed today" : busy || isWriting || isConfirming ? "Claiming…" : "Claim 10,000 VIBECD"}
        </button>
        {isConnected && address ? (
          <span className="text-sm text-secondary">{shortAddress(address)}</span>
        ) : null}
        {isConnected ? (
          <button
            type="button"
            onClick={() => disconnect()}
            className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border px-4 text-sm transition-colors hover:border-foreground hover:bg-[#f4f4f5] active:bg-[#ebebeb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Disconnect Wallet
          </button>
        ) : (
          <div ref={pickerRef} className="relative flex w-full max-w-xs flex-col items-center gap-2">
            <button
              type="button"
              disabled={isConnecting}
              onClick={() => {
                setError(null);
                setPickerOpen((open) => !open);
              }}
              className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border px-5 text-sm font-medium transition-colors hover:border-foreground hover:bg-[#f4f4f5] active:bg-[#ebebeb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                    onClick={() => selectWallet(row)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-[#f4f4f5] active:bg-[#ebebeb] disabled:opacity-50"
                  >
                    <span>{row.label}</span>
                    {!row.connector ? (
                      <span className="text-xs text-secondary">Install</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {!configured ? (
        <p className="mt-4 text-sm text-warning">
          Deploy contracts to Base and set NEXT_PUBLIC_VIBECD_* env vars to enable claiming.
        </p>
      ) : null}
      {status ? <p className="mt-4 text-sm text-success">{status}</p> : null}
      {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
    </section>
  );
}
