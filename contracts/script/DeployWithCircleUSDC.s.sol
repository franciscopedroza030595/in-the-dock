// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {InTheDockPot} from "../src/InTheDockPot.sol";

// Deploys InTheDockPot against Circle's official Celo Sepolia USDC.
// Does NOT deploy MockUSDC — uses real testnet tokens from Circle's faucet.
contract DeployWithCircleUSDC is Script {
    address constant CIRCLE_USDC = 0x01C5C0122039549AD1493B8220cABEdD739BC44E;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        IERC20  usdc        = IERC20(CIRCLE_USDC);

        console.log("Deployer:", deployer);
        console.log("Circle USDC:", CIRCLE_USDC);
        console.log("USDC balance:", usdc.balanceOf(deployer));

        vm.startBroadcast(deployerKey);

        // Deploy the pot contract using Circle USDC
        // entryFee  = 0.10 USDC = 100_000 units (6 decimals)
        // dailySeed = 1.00 USDC = 1_000_000 units
        InTheDockPot pot = new InTheDockPot(
            deployer,       // owner
            deployer,       // operator
            deployer,       // protocolFeeRecipient
            usdc,           // token — Circle Celo Sepolia USDC
            100_000,        // entryFee: 0.10 USDC
            1_000_000       // dailySeed: 1 USDC
        );
        console.log("InTheDockPot deployed:", address(pot));

        // Fund treasury with 10 USDC (10 days of daily seeds)
        usdc.approve(address(pot), 10_000_000);
        pot.fundTreasury(10_000_000);
        console.log("Treasury funded with 10 USDC");

        // Seed today's pot from treasury
        pot.seedCurrentDay();
        console.log("Day 1 pot seeded with 1 USDC");

        vm.stopBroadcast();

        console.log("---");
        console.log("Update Vercel env vars:");
        console.log("NEXT_PUBLIC_USDT_ADDRESS=", CIRCLE_USDC);
        console.log("NEXT_PUBLIC_POT_ADDRESS= ", address(pot));
    }
}
