import type { Metadata } from "next";
import Link from "next/link";
import { CopyableTokenAddress } from "@/components/CopyableTokenAddress";
import { basescanTokenUrl } from "@/lib/base-chain";
import { claimAddresses } from "@/lib/claim";

export const metadata: Metadata = {
  title: "VIBECD",
  description: "VIBECD is a commemorative memecoin celebrating vibe coding on the Base network.",
  alternates: { canonical: "/vibecd" },
};

const FALLBACK_TOKEN_ADDRESS = "0x848fa60cc5652d38c8ab61700964d8ba6682dae1";

export default function VibecdPage() {
  const token = claimAddresses().token || FALLBACK_TOKEN_ADDRESS;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/android-chrome-512x512.png"
          alt="VIBECD"
          width={160}
          height={160}
          className="block h-40 w-40 rounded-2xl"
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          <a
            href={basescanTokenUrl(token)}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            VIBECD
          </a>
        </h1>
        <CopyableTokenAddress address={token} />
        <p className="mt-1.5 max-w-xl text-sm leading-6 text-secondary">
          VIBECD is a commemorative memecoin celebrating vibe coding on the Base network.
        </p>
      </div>

      <table className="mx-auto mt-5 w-full max-w-xl border-collapse text-left text-sm text-secondary">
        <tbody>
          <tr>
            <th className="py-1.5 pr-4 text-right font-normal text-foreground">Fixed Supply: </th>
            <td className="py-1.5">10,000,000,000</td>
          </tr>
          <tr>
            <th className="py-1.5 pr-4 text-right font-normal text-foreground">Community supply: </th>
            <td className="py-1.5">80% reserved for daily claim, 20% for rewards claim</td>
          </tr>
          <tr>
            <th className="py-1.5 pr-4 text-right font-normal text-foreground">Daily claim cap: </th>
            <td className="py-1.5">10,000 VIBECD once per wallet once per IP per day.</td>
          </tr>
          <tr>
            <th className="py-1.5 pr-4 text-right font-normal text-foreground">Rewards claim cap: </th>
            <td className="py-1.5">Up to 200,000 VIBECD once per wallet once per IP per day.</td>
          </tr>
          <tr>
            <th className="py-1.5 pr-4 text-right font-normal text-foreground">Global daily cap: </th>
            <td className="py-1.5">100,000,000 VIBECD.</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href="/#daily-claim"
          className="inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background"
        >
          Daily Claim
        </a>
        <a
          href="/submit#rewards-claim"
          className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground hover:border-foreground"
        >
          Rewards Claim
        </a>
      </div>

      <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-6 text-secondary">
        This is not financial advice.
        <br />
        Claiming does not imply investment value or future returns.
        <br />
        Claiming VIBECD is free. You pay the network gas fee for the on-chain transaction.
      </p>
      <p className="mt-4 text-center text-sm text-secondary">
        <Link href="/terms#vibecd" className="text-accent hover:underline">
          Full details in Terms
        </Link>
      </p>
    </div>
  );
}
