#!/usr/bin/env node
/**
 * Verify VIBECD + VIBECDDailyClaim + VIBECDRewardsClaim on Base mainnet (Etherscan API V2).
 *
 * Usage:
 *   npm run contracts:verify:base
 *
 * Requires in .env:
 *   BASESCAN_API_KEY=... or ETHERSCAN_API_KEY=...
 *   (Etherscan API V2 key: https://etherscan.io/apidashboard — works for Base via chainid)
 *
 * Addresses default from contracts/deployments/base.json or NEXT_PUBLIC_VIBECD_*.
 */
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { encodeAbiParameters, parseAbiParameters } = require("viem");

const ROOT = path.join(__dirname, "..");
const CONTRACTS = path.join(ROOT, "contracts");
/** Etherscan API V2 (unified); Base mainnet chain id 8453 */
const API_URL = "https://api.etherscan.io/v2/api";
const CHAIN_ID = "8453";

try {
  require("dotenv").config({ path: path.join(ROOT, ".env") });
} catch {
  // optional
}

function resolveImport(importerKey, importPath) {
  let fullPath;
  let sourceKey;

  if (importPath.startsWith("@openzeppelin/")) {
    sourceKey = importPath;
    fullPath = path.join(ROOT, "node_modules", importPath);
  } else if (importPath.startsWith(".")) {
    let importerFull;
    if (importerKey.startsWith("@openzeppelin/")) {
      importerFull = path.join(ROOT, "node_modules", importerKey);
      const resolvedFull = path.normalize(path.join(path.dirname(importerFull), importPath));
      fullPath = resolvedFull;
      sourceKey = path
        .relative(path.join(ROOT, "node_modules"), resolvedFull)
        .split(path.sep)
        .join("/");
    } else {
      importerFull = path.join(CONTRACTS, importerKey);
      const resolvedFull = path.normalize(path.join(path.dirname(importerFull), importPath));
      fullPath = resolvedFull;
      sourceKey = path.relative(CONTRACTS, resolvedFull).split(path.sep).join("/");
    }
  } else {
    // Bare relative from contracts/
    sourceKey = importPath;
    fullPath = path.join(CONTRACTS, importPath);
  }

  if (!fs.existsSync(fullPath)) {
    return { error: `File not found: ${importPath} (from ${importerKey} → ${fullPath})` };
  }
  return { key: sourceKey, contents: fs.readFileSync(fullPath, "utf8") };
}

function findImports(importPath) {
  // solc may pass already-resolved @openzeppelin paths or relative leftovers.
  if (importPath.startsWith("@openzeppelin/")) {
    const full = path.join(ROOT, "node_modules", importPath);
    if (!fs.existsSync(full)) return { error: `File not found: ${importPath}` };
    return { contents: fs.readFileSync(full, "utf8") };
  }
  const fromContracts = path.join(CONTRACTS, importPath);
  if (fs.existsSync(fromContracts)) return { contents: fs.readFileSync(fromContracts, "utf8") };
  const fromOz = path.join(ROOT, "node_modules", "@openzeppelin", "contracts", importPath);
  if (fs.existsSync(fromOz)) return { contents: fs.readFileSync(fromOz, "utf8") };
  return { error: `File not found: ${importPath}` };
}

function solcVersionTag() {
  // e.g. "0.8.24+commit.e11b9ed9.Emscripten.clang" → "v0.8.24+commit.e11b9ed9"
  const raw = solc.version();
  const match = raw.match(/^(\d+\.\d+\.\d+\+commit\.[0-9a-f]+)/i);
  if (!match) {
    throw new Error(`Unexpected solc.version(): ${raw}`);
  }
  return `v${match[1]}`;
}

function buildStandardJson() {
  const sources = {
    "VIBECD.sol": { content: fs.readFileSync(path.join(CONTRACTS, "VIBECD.sol"), "utf8") },
    "VIBECDDailyClaim.sol": {
      content: fs.readFileSync(path.join(CONTRACTS, "VIBECDDailyClaim.sol"), "utf8"),
    },
    "VIBECDRewardsClaim.sol": {
      content: fs.readFileSync(path.join(CONTRACTS, "VIBECDRewardsClaim.sol"), "utf8"),
    },
  };

  // Flatten imports into sources so Basescan can recompile without missing files.
  // Relative OZ imports (e.g. ../utils/Context.sol) are resolved against the importer key.
  const pending = [...Object.keys(sources)];
  const seen = new Set(pending);
  while (pending.length) {
    const file = pending.pop();
    const content = sources[file].content;
    const re = /import\s+(?:\{[^}]+}\s+from\s+)?["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(content))) {
      const importPath = m[1];
      const resolved = resolveImport(file, importPath);
      if (resolved.error) throw new Error(resolved.error);
      if (seen.has(resolved.key)) continue;
      sources[resolved.key] = { content: resolved.contents };
      seen.add(resolved.key);
      pending.push(resolved.key);
    }
  }

  return {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };
}

function loadDeployment() {
  const file = path.join(ROOT, "contracts", "deployments", "base.json");
  const fromFile = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const token = process.env.NEXT_PUBLIC_VIBECD_TOKEN_ADDRESS || fromFile.token;
  const claim =
    process.env.NEXT_PUBLIC_VIBECD_CLAIM_ADDRESS || fromFile.dailyClaim || fromFile.claim;
  const rewards =
    process.env.NEXT_PUBLIC_VIBECD_REWARDS_ADDRESS || fromFile.rewards;
  const signer = process.env.CLAIM_SIGNER_ADDRESS || fromFile.signer;
  const owner = fromFile.deployer || process.env.CLAIM_OWNER_ADDRESS;

  if (!token || !claim || !rewards || !signer || !owner) {
    throw new Error(
      "Missing token/claim/rewards/signer/owner. Ensure contracts/deployments/base.json exists (with deployer) or set env vars.",
    );
  }

  const norm = (v) => (v.startsWith("0x") ? v : `0x${v}`);
  return {
    token: norm(token),
    claim: norm(claim),
    rewards: norm(rewards),
    signer: norm(signer),
    owner: norm(owner),
  };
}

function encodeArgs(types, values) {
  // Basescan wants constructor ABI encoding without 0x prefix.
  return encodeAbiParameters(parseAbiParameters(types), values).slice(2);
}

async function submitVerification(payload) {
  // V2 requires chainid as a query param (see apiurl on chainlist).
  const url = `${API_URL}?chainid=${CHAIN_ID}`;
  const body = new URLSearchParams(payload);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (json.status !== "1") {
    throw new Error(`Basescan submit failed: ${JSON.stringify(json)}`);
  }
  return String(json.result);
}

async function pollStatus(apiKey, guid) {
  for (let i = 0; i < 24; i += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    const url = new URL(API_URL);
    url.searchParams.set("chainid", CHAIN_ID);
    url.searchParams.set("module", "contract");
    url.searchParams.set("action", "checkverifystatus");
    url.searchParams.set("guid", guid);
    url.searchParams.set("apikey", apiKey);
    const res = await fetch(url);
    const json = await res.json();
    const result = String(json.result || "");
    console.log(`  status[${i + 1}]:`, result);
    if (/Pass|Already Verified/i.test(result)) return result;
    if (json.status === "0" && !/Pending/i.test(result)) {
      throw new Error(`Verification failed: ${result}`);
    }
  }
  throw new Error("Timed out waiting for Basescan verification");
}

async function verifyOne(options) {
  const { apiKey, address, contractName, compilerVersion, sourceCode, constructorArguments } = options;
  console.log(`\nVerifying ${contractName} @ ${address}`);
  const guid = await submitVerification({
    apikey: apiKey,
    module: "contract",
    action: "verifysourcecode",
    contractaddress: address,
    sourceCode,
    codeformat: "solidity-standard-json-input",
    contractname: contractName,
    compilerversion: compilerVersion,
    optimizationUsed: "1",
    runs: "200",
    constructorArguements: constructorArguments,
    licenseType: "3", // MIT
  });
  console.log("  guid:", guid);
  return pollStatus(apiKey, guid);
}

async function main() {
  const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Set ETHERSCAN_API_KEY or BASESCAN_API_KEY in .env (https://etherscan.io/apidashboard — API V2)",
    );
  }

  const { token, claim, rewards, signer, owner } = loadDeployment();
  const compilerVersion = solcVersionTag();
  const standardJson = buildStandardJson();
  const sourceCode = JSON.stringify(standardJson);

  // Local sanity compile (same input Basescan will use)
  const compiled = JSON.parse(solc.compile(sourceCode, { import: findImports }));
  if (compiled.errors?.some((e) => e.severity === "error")) {
    for (const err of compiled.errors) console.error(err.formattedMessage || err.message);
    process.exit(1);
  }

  console.log("Compiler:", compilerVersion);
  console.log("Token:", token);
  console.log("DailyClaim:", claim);
  console.log("RewardsClaim:", rewards);

  await verifyOne({
    apiKey,
    address: token,
    contractName: "VIBECD.sol:VIBECD",
    compilerVersion,
    sourceCode,
    constructorArguments: encodeArgs("address, address", [claim, rewards]),
  });

  await verifyOne({
    apiKey,
    address: claim,
    contractName: "VIBECDDailyClaim.sol:VIBECDDailyClaim",
    compilerVersion,
    sourceCode,
    constructorArguments: encodeArgs("address, address, address", [token, signer, owner]),
  });

  await verifyOne({
    apiKey,
    address: rewards,
    contractName: "VIBECDRewardsClaim.sol:VIBECDRewardsClaim",
    compilerVersion,
    sourceCode,
    constructorArguments: encodeArgs("address, address, address", [token, signer, owner]),
  });

  console.log("\nDone.");
  console.log(`Token: https://basescan.org/address/${token}#code`);
  console.log(`DailyClaim: https://basescan.org/address/${claim}#code`);
  console.log(`RewardsClaim: https://basescan.org/address/${rewards}#code`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
