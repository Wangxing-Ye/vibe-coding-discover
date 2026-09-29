#!/usr/bin/env node
/**
 * Compile VIBECD contracts with solc and optionally deploy to Base Sepolia.
 *
 * Deploy order:
 *   1) VIBECD (80% → daily claim, 20% → rewards) using predicted vault addresses
 *   2) VIBECDDailyClaim
 *   3) VIBECDRewardsClaim
 *
 * Usage:
 *   node scripts/compile-vibecd.js
 *   npm run contracts:deploy:base-sepolia
 *
 * Requires in .env: DEPLOYER_PRIVATE_KEY (or CLAIM_SIGNER_PRIVATE_KEY) with Base Sepolia ETH.
 */
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const ROOT = path.join(__dirname, "..");
const CONTRACTS = path.join(ROOT, "contracts");
const OUT = path.join(ROOT, "contracts", "out");

try {
  require("dotenv").config({ path: path.join(ROOT, ".env") });
} catch {
  // optional
}

function findImports(importPath) {
  if (importPath.startsWith("@openzeppelin/")) {
    const full = path.join(ROOT, "node_modules", importPath);
    return { contents: fs.readFileSync(full, "utf8") };
  }
  const full = path.join(CONTRACTS, importPath);
  if (fs.existsSync(full)) return { contents: fs.readFileSync(full, "utf8") };
  return { error: `File not found: ${importPath}` };
}

function compile() {
  const sources = {
    "VIBECD.sol": { content: fs.readFileSync(path.join(CONTRACTS, "VIBECD.sol"), "utf8") },
    "VIBECDDailyClaim.sol": { content: fs.readFileSync(path.join(CONTRACTS, "VIBECDDailyClaim.sol"), "utf8") },
    "VIBECDRewardsClaim.sol": { content: fs.readFileSync(path.join(CONTRACTS, "VIBECDRewardsClaim.sol"), "utf8") },
  };

  const input = {
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

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  if (output.errors?.length) {
    const fatal = output.errors.filter((e) => e.severity === "error");
    for (const err of output.errors) console.error(err.formattedMessage || err.message);
    if (fatal.length) process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const artifacts = {};
  for (const file of Object.keys(output.contracts)) {
    for (const name of Object.keys(output.contracts[file])) {
      const art = output.contracts[file][name];
      artifacts[name] = {
        abi: art.abi,
        bytecode: "0x" + art.evm.bytecode.object,
      };
      fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(artifacts[name], null, 2));
      console.log("compiled", name);
    }
  }
  return artifacts;
}

async function deploy(artifacts) {
  const { createWalletClient, createPublicClient, http, getContractAddress, encodeDeployData } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { baseSepolia } = await import("viem/chains");

  const key = process.env.DEPLOYER_PRIVATE_KEY || process.env.CLAIM_SIGNER_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "Set DEPLOYER_PRIVATE_KEY (or CLAIM_SIGNER_PRIVATE_KEY) in .env — the address needs Base Sepolia ETH.",
    );
  }
  const normalized = key.startsWith("0x") ? key : `0x${key}`;
  const account = privateKeyToAccount(normalized);
  const signerAddress = process.env.CLAIM_SIGNER_ADDRESS || account.address;

  const transport = http(process.env.BASE_RPC_URL || "https://base-sepolia-rpc.publicnode.com");
  const publicClient = createPublicClient({ chain: baseSepolia, transport });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport });

  const nonce = await publicClient.getTransactionCount({ address: account.address });
  // nonce: token, nonce+1: daily claim, nonce+2: rewards claim
  const predictedDaily = getContractAddress({ from: account.address, nonce: BigInt(nonce + 1) });
  const predictedRewards = getContractAddress({ from: account.address, nonce: BigInt(nonce + 2) });
  console.log("Deployer:", account.address);
  console.log("Signer:", signerAddress);
  console.log("Predicted DailyClaim:", predictedDaily);
  console.log("Predicted RewardsClaim:", predictedRewards);

  const tokenDeploy = encodeDeployData({
    abi: artifacts.VIBECD.abi,
    bytecode: artifacts.VIBECD.bytecode,
    args: [predictedDaily, predictedRewards],
  });
  const tokenHash = await walletClient.sendTransaction({ data: tokenDeploy });
  const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
  const tokenAddress = tokenReceipt.contractAddress;
  console.log("VIBECD:", tokenAddress, tokenHash);

  const dailyDeploy = encodeDeployData({
    abi: artifacts.VIBECDDailyClaim.abi,
    bytecode: artifacts.VIBECDDailyClaim.bytecode,
    args: [tokenAddress, signerAddress, account.address],
  });
  const dailyHash = await walletClient.sendTransaction({ data: dailyDeploy });
  const dailyReceipt = await publicClient.waitForTransactionReceipt({ hash: dailyHash });
  const dailyAddress = dailyReceipt.contractAddress;
  console.log("VIBECDDailyClaim:", dailyAddress, dailyHash);

  const rewardsDeploy = encodeDeployData({
    abi: artifacts.VIBECDRewardsClaim.abi,
    bytecode: artifacts.VIBECDRewardsClaim.bytecode,
    args: [tokenAddress, signerAddress, account.address],
  });
  const rewardsHash = await walletClient.sendTransaction({ data: rewardsDeploy });
  const rewardsReceipt = await publicClient.waitForTransactionReceipt({ hash: rewardsHash });
  const rewardsAddress = rewardsReceipt.contractAddress;
  console.log("VIBECDRewardsClaim:", rewardsAddress, rewardsHash);

  if (dailyAddress.toLowerCase() !== predictedDaily.toLowerCase()) {
    throw new Error(`Daily claim mismatch: ${predictedDaily} vs ${dailyAddress}`);
  }
  if (rewardsAddress.toLowerCase() !== predictedRewards.toLowerCase()) {
    throw new Error(`Rewards claim mismatch: ${predictedRewards} vs ${rewardsAddress}`);
  }

  const out = {
    network: "baseSepolia",
    chainId: 84532,
    token: tokenAddress,
    claim: dailyAddress,
    dailyClaim: dailyAddress,
    rewards: rewardsAddress,
    signer: signerAddress,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
  };
  const outPath = path.join(ROOT, "contracts", "deployments", "baseSepolia.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote", outPath);
  console.log("\nAdd to .env:");
  console.log(`NEXT_PUBLIC_VIBECD_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`NEXT_PUBLIC_VIBECD_CLAIM_ADDRESS=${dailyAddress}`);
  console.log(`NEXT_PUBLIC_VIBECD_REWARDS_ADDRESS=${rewardsAddress}`);
  console.log(`CLAIM_SIGNER_ADDRESS=${signerAddress}`);
  console.log("CLAIM_SIGNER_PRIVATE_KEY=<signer private key>");
  console.log("NEXT_PUBLIC_BASE_CHAIN_ID=84532");
}

async function main() {
  const artifacts = compile();
  if (process.argv.includes("--deploy")) {
    await deploy(artifacts);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
