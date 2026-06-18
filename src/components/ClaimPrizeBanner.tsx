"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { POT_ADDRESS } from "@/lib/chain";
import { ITD_ABI } from "@/lib/onchain";
import { useCurrentPlayer } from "@/lib/wallet";
import { Trophy, Loader2 } from "lucide-react";
import { useGameStore } from "@/store/gameStore";

export default function ClaimPrizeBanner() {
  const { address, isConnected } = useCurrentPlayer();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const addEarned = useGameStore((s) => s.addEarned);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimedLocal] = useState(false);
  const [error, setError] = useState("");

  // Read the contract's current day
  const { data: currentDay } = useReadContract({
    address: POT_ADDRESS,
    abi: ITD_ABI,
    functionName: "currentDay",
    query: { enabled: isConnected && !!address },
  });

  // The last closed day is currentDay - 1
  const closedDay = currentDay !== undefined ? (currentDay as bigint) - 1n : undefined;

  const { data: winner } = useReadContract({
    address: POT_ADDRESS,
    abi: ITD_ABI,
    functionName: "winnerOf",
    args: [closedDay as bigint],
    query: { enabled: closedDay !== undefined && closedDay > 0n },
  });

  const { data: alreadyClaimed } = useReadContract({
    address: POT_ADDRESS,
    abi: ITD_ABI,
    functionName: "claimed",
    args: [closedDay as bigint],
    query: { enabled: closedDay !== undefined && closedDay > 0n },
  });

  const { data: potAmount } = useReadContract({
    address: POT_ADDRESS,
    abi: ITD_ABI,
    functionName: "viewPot",
    args: [closedDay as bigint],
    query: { enabled: closedDay !== undefined && closedDay > 0n },
  });

  const isWinner =
    address &&
    winner &&
    (winner as string).toLowerCase() === address.toLowerCase();

  const canClaim = isWinner && !alreadyClaimed && !claimed && potAmount && (potAmount as bigint) > 0n;

  async function handleClaim() {
    if (!canClaim || claiming) return;
    setClaiming(true);
    setError("");
    try {
      const hash = await writeContractAsync({
        address: POT_ADDRESS,
        abi: ITD_ABI,
        functionName: "claim",
        args: [closedDay as bigint],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      }
      addEarned(Number(potAmount as bigint) / 1_000_000);
      setClaimedLocal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("rejected") && !msg.includes("denied")) {
        setError("Claim failed — try again");
      }
    }
    setClaiming(false);
  }

  if (!isWinner || alreadyClaimed || claimed) return null;
  if (!potAmount || (potAmount as bigint) === 0n) return null;

  const usdcAmount = (Number(potAmount as bigint) / 1_000_000).toFixed(2);

  return (
    <div className="rounded-2xl p-4 mb-4 border border-gold/40 bg-gold/5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-gold flex-shrink-0" />
        <div>
          <p className="font-black text-white text-sm">You won yesterday! 🎉</p>
          <p className="text-xs text-muted mt-0.5">Claim your <span className="text-gold font-bold">{usdcAmount} USDC</span> prize</p>
        </div>
      </div>
      <button
        onClick={handleClaim}
        disabled={claiming}
        className="btn-brand w-full py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {claiming ? <Loader2 size={15} className="animate-spin" /> : <Trophy size={15} />}
        {claiming ? "Claiming…" : `Claim ${usdcAmount} USDC`}
      </button>
      {error && <p className="text-xs text-center text-red-400">{error}</p>}
    </div>
  );
}
