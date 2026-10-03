import { basescanAddressUrl, basescanTokenUrl } from "@/lib/base-chain";
import { claimAddresses } from "@/lib/claim";

export function VibecdTermsContent() {
  const fromEnv = claimAddresses();
  const token = fromEnv.token || "0x848fa60cc5652d38c8ab61700964d8ba6682dae1";
  const claim = fromEnv.claim || "0xfef6a0f15e3783540df1f58f4bcd7a7e28751ec6";
  const rewards = fromEnv.rewards || "0x11bde142c37f76b41ff3b2bf5db96f552d427578";

  return (
    <div className="mt-4 space-y-4 text-[15px] leading-7 text-secondary">
      <p>
        VIBECD is a commemorative memecoin celebrating vibe coding. It is offered on the Base
        network.
      </p>
      <table className="w-full max-w-xl border-collapse text-left text-sm text-secondary">
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
            <td className="py-1.5">100,000,000 VIBECD (daily claim vault).</td>
          </tr>
          {token ? (
            <tr>
              <th className="py-1.5 pr-4 align-top text-right font-normal text-foreground">Token: </th>
              <td className="py-1.5 break-all">
                <a
                  href={basescanTokenUrl(token)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {token}
                </a>
              </td>
            </tr>
          ) : null}
          {claim ? (
            <tr>
              <th className="py-1.5 pr-4 align-top text-right font-normal text-foreground">Daily claim: </th>
              <td className="py-1.5 break-all">
                <a
                  href={basescanAddressUrl(claim)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {claim}
                </a>
              </td>
            </tr>
          ) : null}
          {rewards ? (
            <tr>
              <th className="py-1.5 pr-4 align-top text-right font-normal text-foreground">Rewards claim: </th>
              <td className="py-1.5 break-all">
                <a
                  href={basescanAddressUrl(rewards)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {rewards}
                </a>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p>
        The entire fixed supply was minted at deployment to the Daily Claim and Rewards Claim
        contracts (80% / 20%). There is no team, founder, or creator allocation. The token
        contract cannot mint more VIBECD. Anyone—including the deployer—can receive VIBECD from
        those vaults only through the same public paths: the daily claim, or rewards for newly
        published AI open-source submissions. Claimed tokens may still be transferred between
        wallets on Base.
      </p>
      <p>Days are measured in UTC.</p>
      <p>
        Claims require connecting a compatible wallet and completing an on-chain transaction.
        Claiming VIBECD is free. You pay the network gas fee for the on-chain transaction; we do
        not charge a claim fee. We may refuse, pause, or change claim availability for
        operational, security, or abuse reasons. Smart contracts and network conditions can
        fail; claimed tokens may be lost or unusable if you interact incorrectly.
      </p>
      <p className="text-foreground">
        This is not financial advice. Claiming does not imply investment value or future returns.
        VIBECD is not an offer of securities, an investment product, or a guarantee of any
        economic benefit.
      </p>
    </div>
  );
}
