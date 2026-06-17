import { celoSepolia } from "viem/chains";
import { fallback, http, type Transport } from "viem";

const SEPOLIA_RPC = "https://celo-sepolia.drpc.org";

export const ACTIVE_CHAIN = celoSepolia;

export const POT_ADDRESS = (
  process.env.NEXT_PUBLIC_POT_ADDRESS || "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

export const USDC_ADDRESS = (
  process.env.NEXT_PUBLIC_USDT_ADDRESS || "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

// 0.10 USDC — 6 decimals
export const ENTRY_FEE_UNITS = BigInt(100_000);

// Using Circle's official Celo Sepolia USDC (no CIP-64 fee adapter on testnet).
// Users pay gas in CELO — get it from faucet.celo.org/celo-sepolia.
export const CELO_TRANSPORT: Transport = fallback([
  http(process.env.NEXT_PUBLIC_CELO_RPC_URL || SEPOLIA_RPC),
  http(SEPOLIA_RPC),
]);

export const USDT_DECIMALS = 6;
