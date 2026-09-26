// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title VIBECD — commemorative meme token for Vibe Coding Discover
/// @dev Fixed supply; 80% to daily claim vault, 20% to submission rewards vault.
contract VIBECD is ERC20 {
    uint256 public constant TOTAL_SUPPLY = 10_000_000_000 ether; // 10 billion * 1e18
    uint256 public constant DAILY_CLAIM_BPS = 8_000; // 80%
    uint256 public constant REWARDS_BPS = 2_000; // 20%
    uint256 public constant BPS_DENOM = 10_000;

    constructor(address dailyClaimVault, address rewardsVault) ERC20("Vibe Coding Discover", "VIBECD") {
        require(dailyClaimVault != address(0) && rewardsVault != address(0), "vault=0");
        require(dailyClaimVault != rewardsVault, "vaults");
        uint256 dailyAmount = (TOTAL_SUPPLY * DAILY_CLAIM_BPS) / BPS_DENOM;
        uint256 rewardsAmount = TOTAL_SUPPLY - dailyAmount;
        _mint(dailyClaimVault, dailyAmount);
        _mint(rewardsVault, rewardsAmount);
    }
}
