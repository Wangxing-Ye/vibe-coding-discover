// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title VIBECDDailyClaim — commemorative daily airdrop on Base
/// @notice 10_000 tokens per claim; 1 claim per wallet per UTC day; 100M tokens/day global cap.
///         Backend signer enforces 1 claim ticket per IP per day.
contract VIBECDDailyClaim is EIP712, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "Claim(address wallet,uint256 day,uint256 nonce,uint256 amount,uint256 chainId,address verifyingContract)"
    );

    uint256 public constant CLAIM_AMOUNT = 10_000 ether;
    uint256 public constant DAILY_GLOBAL_CAP = 100_000_000 ether; // 100 million / day

    IERC20 public immutable token;
    address public signer;

    mapping(address => mapping(uint256 => bool)) public claimedOnDay;
    mapping(uint256 => uint256) public globalClaimedOnDay;
    mapping(address => mapping(uint256 => bool)) public usedNonce;

    event Claimed(address indexed wallet, uint256 indexed day, uint256 amount, uint256 nonce);
    event SignerUpdated(address indexed signer);

    constructor(address token_, address signer_, address owner_)
        EIP712("VIBECDDailyClaim", "1")
        Ownable(owner_)
    {
        require(token_ != address(0) && signer_ != address(0) && owner_ != address(0), "zero");
        token = IERC20(token_);
        signer = signer_;
    }

    function currentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function remainingToday() public view returns (uint256) {
        uint256 day = currentDay();
        uint256 used = globalClaimedOnDay[day];
        if (used >= DAILY_GLOBAL_CAP) return 0;
        return DAILY_GLOBAL_CAP - used;
    }

    function hasClaimedToday(address wallet) external view returns (bool) {
        return claimedOnDay[wallet][currentDay()];
    }

    function setSigner(address next) external onlyOwner {
        require(next != address(0), "signer=0");
        signer = next;
        emit SignerUpdated(next);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function renounceToDead() external onlyOwner {
        _transferOwnership(address(0x000000000000000000000000000000000000dEaD));
    }

    function claim(uint256 day, uint256 nonce, bytes calldata signature)
        external
        nonReentrant
        whenNotPaused
    {
        require(day == currentDay(), "bad day");
        require(!claimedOnDay[msg.sender][day], "already claimed");
        require(!usedNonce[msg.sender][nonce], "nonce used");
        require(globalClaimedOnDay[day] + CLAIM_AMOUNT <= DAILY_GLOBAL_CAP, "daily cap");

        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                msg.sender,
                day,
                nonce,
                CLAIM_AMOUNT,
                block.chainid,
                address(this)
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == signer, "bad sig");

        claimedOnDay[msg.sender][day] = true;
        usedNonce[msg.sender][nonce] = true;
        globalClaimedOnDay[day] += CLAIM_AMOUNT;

        token.safeTransfer(msg.sender, CLAIM_AMOUNT);
        emit Claimed(msg.sender, day, CLAIM_AMOUNT, nonce);
    }
}
