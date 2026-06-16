// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {InTheDockPot} from "../src/InTheDockPot.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy mock USDC (testnet only)
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed:", address(usdc));

        // 2. Mint 100 USDC to the deployer for testing
        usdc.mint(deployer, 100_000_000); // 100 USDC (6 decimals)

        // 3. Deploy the pot contract
        //    entryFee = 0.10 USDC = 100_000 units (6 decimals)
        //    dailySeed = 1 USDC = 1_000_000 units
        InTheDockPot pot = new InTheDockPot(
            deployer,           // owner
            deployer,           // operator
            deployer,           // protocolFeeRecipient
            usdc,               // token
            100_000,            // entryFee: 0.10 USDC
            1_000_000           // dailySeed: 1 USDC
        );
        console.log("InTheDockPot deployed:", address(pot));

        // 4. Fund the treasury with 10 USDC to seed 10 days of pots
        usdc.approve(address(pot), 10_000_000);
        pot.fundTreasury(10_000_000);
        console.log("Treasury funded with 10 USDC");

        // 5. Seed today's pot
        pot.seedCurrentDay();
        console.log("Day 1 pot seeded");

        vm.stopBroadcast();

        console.log("---");
        console.log("Add to .env:");
        console.log("NEXT_PUBLIC_USDT_ADDRESS=", address(usdc));
        console.log("NEXT_PUBLIC_POT_ADDRESS=", address(pot));
    }
}
