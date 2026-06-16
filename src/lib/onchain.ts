import { createPublicClient, parseEventLogs, type Abi, type Hex } from "viem";
import { ACTIVE_CHAIN, CELO_TRANSPORT, POT_ADDRESS } from "./chain";
import InTheDockArtifact from "./contracts/InTheDockPot.json";

export const ITD_ABI = InTheDockArtifact.abi as Abi;

export const celoClient = createPublicClient({
  chain: ACTIVE_CHAIN,
  transport: CELO_TRANSPORT,
});

type PlayedArgs = {
  day: bigint;
  player: `0x${string}`;
  wasFree: boolean;
  potAfter: bigint;
};

export type VerifyResult =
  | { valid: true; wasFree: boolean; potAfter: bigint; dayNumber: bigint }
  | { valid: false; reason: string };

export async function verifyPaymentTx(
  txHash: string,
  player: string,
): Promise<VerifyResult> {
  let receipt;
  try {
    receipt = await celoClient.getTransactionReceipt({ hash: txHash as Hex });
  } catch {
    return { valid: false, reason: "tx-not-found" };
  }

  if (receipt.status !== "success") return { valid: false, reason: "tx-failed" };
  if (!receipt.to || receipt.to.toLowerCase() !== POT_ADDRESS.toLowerCase())
    return { valid: false, reason: "wrong-contract" };
  if (receipt.from.toLowerCase() !== player.toLowerCase())
    return { valid: false, reason: "wrong-signer" };

  const block = await celoClient.getBlock({ blockHash: receipt.blockHash });
  const blockTime = Number(block.timestamp);
  const now = new Date();
  const dayStart = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000,
  );
  if (blockTime < dayStart || blockTime >= dayStart + 86_400)
    return { valid: false, reason: "tx-not-today" };

  const events = parseEventLogs({ abi: ITD_ABI, logs: receipt.logs, eventName: "Played" });
  const played = events.find((e) => {
    const a = e.args as unknown as PlayedArgs | undefined;
    return a && a.player.toLowerCase() === player.toLowerCase();
  });
  if (!played) return { valid: false, reason: "no-played-event" };

  const args = played.args as unknown as PlayedArgs;
  return { valid: true, wasFree: args.wasFree, potAfter: args.potAfter, dayNumber: args.day };
}

export async function readHasFreePlayToday(player: `0x${string}`): Promise<boolean> {
  return (await celoClient.readContract({
    address: POT_ADDRESS,
    abi: ITD_ABI,
    functionName: "hasFreePlayToday",
    args: [player],
  })) as boolean;
}

export async function readCurrentDay(): Promise<bigint> {
  return (await celoClient.readContract({
    address: POT_ADDRESS,
    abi: ITD_ABI,
    functionName: "currentDay",
    args: [],
  })) as bigint;
}

export async function readPotAmount(day: bigint): Promise<bigint> {
  return (await celoClient.readContract({
    address: POT_ADDRESS,
    abi: ITD_ABI,
    functionName: "viewPot",
    args: [day],
  })) as bigint;
}
