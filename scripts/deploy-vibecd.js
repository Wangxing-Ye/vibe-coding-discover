/**
 * Hardhat deploy helper (optional). Prefer:
 *   npm run contracts:deploy:base-sepolia
 * which uses scripts/compile-vibecd.js --deploy
 */
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const signerAddress = process.env.CLAIM_SIGNER_ADDRESS || deployer.address;
  console.log("Claim signer:", signerAddress);

  const deployerNonce = await ethers.provider.getTransactionCount(deployer.address);
  // nonce N: token, N+1: daily claim, N+2: rewards claim
  const predictedDaily = ethers.getCreateAddress({ from: deployer.address, nonce: deployerNonce + 1 });
  const predictedRewards = ethers.getCreateAddress({
    from: deployer.address,
    nonce: deployerNonce + 2,
  });
  console.log("Predicted DailyClaim:", predictedDaily);
  console.log("Predicted RewardsClaim:", predictedRewards);

  const Token = await ethers.getContractFactory("VIBECD");
  const token = await Token.deploy(predictedDaily, predictedRewards);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("VIBECD:", tokenAddress);

  const DailyClaim = await ethers.getContractFactory("VIBECDDailyClaim");
  const daily = await DailyClaim.deploy(tokenAddress, signerAddress, deployer.address);
  await daily.waitForDeployment();
  const dailyAddress = await daily.getAddress();
  console.log("VIBECDDailyClaim:", dailyAddress);

  const RewardsClaim = await ethers.getContractFactory("VIBECDRewardsClaim");
  const rewards = await RewardsClaim.deploy(tokenAddress, signerAddress, deployer.address);
  await rewards.waitForDeployment();
  const rewardsAddress = await rewards.getAddress();
  console.log("VIBECDRewardsClaim:", rewardsAddress);

  if (dailyAddress.toLowerCase() !== predictedDaily.toLowerCase()) {
    throw new Error(`Daily claim mismatch: predicted ${predictedDaily} got ${dailyAddress}`);
  }
  if (rewardsAddress.toLowerCase() !== predictedRewards.toLowerCase()) {
    throw new Error(`Rewards claim mismatch: predicted ${predictedRewards} got ${rewardsAddress}`);
  }

  const dailyBal = await token.balanceOf(dailyAddress);
  const rewardsBal = await token.balanceOf(rewardsAddress);
  console.log("Daily vault:", ethers.formatEther(dailyBal), "VIBECD");
  console.log("Rewards vault:", ethers.formatEther(rewardsBal), "VIBECD");

  const out = {
    network: "baseSepolia",
    chainId: 84532,
    token: tokenAddress,
    claim: dailyAddress,
    dailyClaim: dailyAddress,
    rewards: rewardsAddress,
    signer: signerAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };
  const outPath = path.join(__dirname, "..", "contracts", "deployments", "baseSepolia.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote", outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
