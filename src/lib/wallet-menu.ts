import type { Connector } from "wagmi";

export type WalletMenuItem = {
  key: string;
  label: string;
  installUrl: string;
  match: (connector: Connector) => boolean;
};

export type WalletMenuRow = {
  key: string;
  label: string;
  connector?: Connector;
  installUrl: string;
};

export const WALLET_MENU: WalletMenuItem[] = [
  {
    key: "metamask",
    label: "MetaMask",
    installUrl: "https://metamask.io/download/",
    match: (c) => c.id === "metaMaskSDK" || /metamask/i.test(c.name) || c.id.toLowerCase().includes("metamask"),
  },
  {
    key: "coinbase",
    label: "Coinbase Wallet",
    installUrl: "https://www.coinbase.com/wallet/downloads",
    match: (c) => c.id === "coinbaseWalletSDK" || /coinbase/i.test(c.name),
  },
  {
    key: "trust",
    label: "Trust Wallet",
    installUrl: "https://trustwallet.com/browser-extension",
    match: (c) => /trust/i.test(c.name) || c.id.toLowerCase().includes("trust"),
  },
  {
    key: "okx",
    label: "OKX Wallet",
    installUrl: "https://www.okx.com/web3",
    match: (c) => /okx/i.test(c.name) || c.id.toLowerCase().includes("okx"),
  },
  {
    key: "binance",
    label: "Binance Wallet",
    installUrl: "https://www.binance.com/en/web3wallet",
    match: (c) => /binance/i.test(c.name) || c.id.toLowerCase().includes("binance"),
  },
  {
    key: "phantom",
    label: "Phantom",
    installUrl: "https://phantom.app/download",
    match: (c) => /phantom/i.test(c.name) || c.id.toLowerCase().includes("phantom"),
  },
  {
    key: "rabby",
    label: "Rabby",
    installUrl: "https://rabby.io/",
    match: (c) => /rabby/i.test(c.name) || c.id.toLowerCase().includes("rabby"),
  },
];

export function isGenericInjected(connector: Connector) {
  return connector.id === "injected" || connector.name.trim().toLowerCase() === "injected";
}

/** Same wallet picker rows as homepage daily claim. */
export function buildWalletMenuRows(connectors: readonly Connector[]): WalletMenuRow[] {
  const usableConnectors = connectors.filter((connector) => !isGenericInjected(connector));
  const used = new Set<string>();
  const rows: WalletMenuRow[] = [];

  for (const item of WALLET_MENU) {
    const connector = usableConnectors.find((c) => item.match(c) && !used.has(c.uid));
    if (connector) used.add(connector.uid);
    rows.push({
      key: item.key,
      label: item.label,
      connector,
      installUrl: item.installUrl,
    });
  }

  for (const connector of usableConnectors) {
    if (used.has(connector.uid)) continue;
    if (connector.id === "walletConnect") continue;
    rows.push({
      key: connector.uid,
      label: connector.name,
      connector,
      installUrl: "",
    });
    used.add(connector.uid);
  }

  const wc = usableConnectors.find((c) => c.id === "walletConnect");
  if (wc) {
    rows.push({
      key: "walletConnect",
      label: "WalletConnect",
      connector: wc,
      installUrl: "",
    });
  }

  return rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

/** Strip viem/wagmi Details/Version noise from wallet errors. */
export function formatWalletError(err: unknown, fallback: string) {
  const raw =
    err && typeof err === "object" && "shortMessage" in err && typeof (err as { shortMessage: unknown }).shortMessage === "string"
      ? (err as { shortMessage: string }).shortMessage
      : err instanceof Error
        ? err.message
        : fallback;

  const cleaned = raw
    .split(/\nDetails:|\nVersion:|\nURL:|\.\s*Details:|\.\s*Version:|\.\s*URL:/i)[0]
    .replace(/\s+Details:.*$/i, "")
    .replace(/\s+Version:\s*viem@[\d.]+/gi, "")
    .replace(/^.*?Error:\s*/i, "")
    .trim();

  const text = cleaned || fallback;
  const lower = text.toLowerCase();
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("request rejected")
  ) {
    return "User rejected the request.";
  }

  return text.slice(0, 160);
}
