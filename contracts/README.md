# VIBECD (Base mainnet commemorative airdrop)

Short memorial meme token for Vibe Coding Discover.

## Parameters

- Symbol: `VIBECD`
- Supply: 10,000,000,000
  - 80% → daily claim vault (`VIBECDDailyClaim`)
  - 20% → submission rewards vault (`VIBECDRewardsClaim`)
- Daily claim: 10,000 / wallet / UTC day (1×)
- Submission reward: 20,000 per published submission (max 10 / IP / UTC day)
- IP: 1 daily-claim ticket / UTC day (backend)
- Daily global cap (daily claim): 100,000,000
- Network: Base (`8453`)

## Contracts

- `contracts/VIBECD.sol`
- `contracts/VIBECDDailyClaim.sol`
- `contracts/VIBECDRewardsClaim.sol`

```bash
# Compile
npm run contracts:compile

# Deploy (needs Base mainnet ETH on DEPLOYER_PRIVATE_KEY)
# CLAIM_SIGNER_ADDRESS should match CLAIM_SIGNER_PRIVATE_KEY
export DEPLOYER_PRIVATE_KEY=0x...
export CLAIM_SIGNER_ADDRESS=0x...
npm run contracts:deploy:base
```

Copy printed addresses into `.env`:

```
NEXT_PUBLIC_VIBECD_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_VIBECD_CLAIM_ADDRESS=0x...
NEXT_PUBLIC_VIBECD_REWARDS_ADDRESS=0x...
CLAIM_SIGNER_PRIVATE_KEY=0x...
CLAIM_SIGNER_ADDRESS=0x...
NEXT_PUBLIC_BASE_CHAIN_ID=8453
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=  # https://cloud.walletconnect.com
```

Deployer needs ETH on Base for gas: https://bridge.base.org

## Verify on Basescan

1. Create an **Etherscan API V2** key at https://etherscan.io/apidashboard  
   (Basescan V1 endpoints are deprecated; one Etherscan key covers Base via `chainid=8453`)
2. Add to `.env`: `ETHERSCAN_API_KEY=...` (or `BASESCAN_API_KEY=...`)
3. Run:

```bash
npm run contracts:verify:base
```

Uses `contracts/deployments/base.json` (or `NEXT_PUBLIC_VIBECD_*` + `CLAIM_SIGNER_ADDRESS`) and uploads standard-json-input matching the solc 0.8.24 / optimizer 200 build.

After deploy, restart `npm run dev` (or rebuild the Docker image so `NEXT_PUBLIC_*` are baked in). Daily claim is on the homepage; submission rewards claim is on `/submit`.
