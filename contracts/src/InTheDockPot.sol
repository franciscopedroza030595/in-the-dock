// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title InTheDockPot
/// @notice Daily winner-takes-all pot for the In The Dock trivia game.
///         Players pay an entry fee in USDT. 80% feeds the day's pot,
///         20% is the protocol fee. First play per wallet per UTC day is free.
///         At 00:00 UTC the operator calls `rollDay` to close yesterday,
///         declare the winner (highest score per off-chain DB), and open today.
contract InTheDockPot is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public immutable entryFee;         // 0.10 USDT = 100_000 (6 decimals)
    uint256 public constant FEE_BPS  = 10000; // 100% of replay fee goes to protocol treasury; pot is seeded separately
    uint256 public constant BPS_DENOM = 10_000;
    uint256 public constant GAME_ID  = 1;

    address public operator;
    address public protocolFeeRecipient;

    uint256 public treasury;
    uint256 public dailySeed;
    uint256 public currentDay;
    uint256 public dayStartedAt;

    mapping(uint256 => uint256) public pot;           // day => amount
    mapping(uint256 => address) public winnerOf;      // day => winner
    mapping(uint256 => bool)    public claimed;       // day => claimed
    mapping(address => uint256) public lastFreePlayDay;

    event TreasuryFunded(address indexed from, uint256 amount);
    event DailySeedUpdated(uint256 amount);
    event Played(uint256 indexed day, address indexed player, bool wasFree, uint256 potAfter);
    event DayRolled(uint256 indexed closedDay, address closedWinner, uint256 closedPot, uint256 indexed newDay, uint256 seeded);
    event Claimed(uint256 indexed day, address indexed winner, uint256 amount);
    event WinnerOverridden(uint256 indexed day, address newWinner);
    event OperatorChanged(address indexed newOperator);
    event ProtocolFeeRecipientChanged(address indexed newRecipient);
    event PotSponsored(uint256 indexed day, address indexed sponsor, uint256 amount);

    error NotOperator();
    error NotInitialized();
    error AlreadyClaimed();
    error NotWinner();
    error NothingToClaim();
    error ZeroAddress();
    error InvalidAmount();

    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner()) revert NotOperator();
        _;
    }

    constructor(
        address _owner,
        address _operator,
        address _protocolFeeRecipient,
        IERC20 _token,
        uint256 _entryFee,
        uint256 _dailySeed
    ) Ownable(_owner) {
        if (_operator == address(0) || _protocolFeeRecipient == address(0) || address(_token) == address(0)) {
            revert ZeroAddress();
        }
        operator            = _operator;
        protocolFeeRecipient = _protocolFeeRecipient;
        token               = _token;
        entryFee            = _entryFee;
        dailySeed           = _dailySeed;
        currentDay          = 1;
        dayStartedAt        = block.timestamp;
    }

    // ----------------------------------------------------------------- admin

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert ZeroAddress();
        operator = newOperator;
        emit OperatorChanged(newOperator);
    }

    function setProtocolFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        protocolFeeRecipient = newRecipient;
        emit ProtocolFeeRecipientChanged(newRecipient);
    }

    function setDailySeed(uint256 amount) external onlyOwner {
        dailySeed = amount;
        emit DailySeedUpdated(amount);
    }

    function overrideWinner(uint256 day, address newWinner) external onlyOwner {
        if (claimed[day]) revert AlreadyClaimed();
        winnerOf[day] = newWinner;
        emit WinnerOverridden(day, newWinner);
    }

    // ------------------------------------------------------------- treasury

    function fundTreasury(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        treasury += amount;
        emit TreasuryFunded(msg.sender, amount);
    }

    function withdrawTreasury(uint256 amount, address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0 || amount > treasury) revert InvalidAmount();
        treasury -= amount;
        token.safeTransfer(to, amount);
    }

    function seedCurrentDay() external onlyOperator {
        uint256 day   = currentDay;
        uint256 gap   = dailySeed > pot[day] ? dailySeed - pot[day] : 0;
        uint256 avail = treasury;
        uint256 amount = gap <= avail ? gap : avail;
        if (amount == 0) return;
        treasury -= amount;
        pot[day] += amount;
    }

    function sponsorPot(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        pot[currentDay] += amount;
        emit PotSponsored(currentDay, msg.sender, amount);
    }

    // ------------------------------------------------------------------ play

    function play() external returns (bool wasFree) {
        uint256 day = currentDay;

        if (lastFreePlayDay[msg.sender] < day) {
            lastFreePlayDay[msg.sender] = day;
            wasFree = true;
        } else {
            uint256 fee = entryFee;
            token.safeTransferFrom(msg.sender, address(this), fee);
            uint256 protocolCut = (fee * FEE_BPS) / BPS_DENOM;
            uint256 potCut      = fee - protocolCut;
            pot[day]            += potCut;
            token.safeTransfer(protocolFeeRecipient, protocolCut);
            wasFree = false;
        }

        emit Played(day, msg.sender, wasFree, pot[day]);
    }

    // ------------------------------------------------------------- rollover

    function rollDay(address winnerOfClosedDay) external onlyOperator {
        uint256 closedDay = currentDay;
        winnerOf[closedDay] = winnerOfClosedDay;

        uint256 newDay = closedDay + 1;
        currentDay    = newDay;
        dayStartedAt  = block.timestamp;

        uint256 closedPot = pot[closedDay];
        uint256 toSeed;

        if (winnerOfClosedDay == address(0) && closedPot > 0) {
            pot[closedDay] = 0;
            toSeed = closedPot;
        } else {
            uint256 avail = treasury;
            toSeed = dailySeed <= avail ? dailySeed : avail;
            if (toSeed > 0) treasury -= toSeed;
        }

        if (toSeed > 0) pot[newDay] += toSeed;

        emit DayRolled(closedDay, winnerOfClosedDay, closedPot, newDay, toSeed);
    }

    // ----------------------------------------------------------------- claim

    function claim(uint256 day) external {
        if (claimed[day]) revert AlreadyClaimed();
        if (winnerOf[day] != msg.sender) revert NotWinner();
        uint256 amount = pot[day];
        if (amount == 0) revert NothingToClaim();
        claimed[day] = true;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(day, msg.sender, amount);
    }

    // ------------------------------------------------------------------- view

    function hasFreePlayToday(address user) external view returns (bool) {
        return lastFreePlayDay[user] < currentDay;
    }

    function viewPot(uint256 day) external view returns (uint256) {
        return pot[day];
    }
}
